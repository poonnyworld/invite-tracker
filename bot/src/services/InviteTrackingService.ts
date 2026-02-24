import { Guild, GuildMember, Invite, TextChannel } from 'discord.js';
import { Invite as InviteModel } from '../models/Invite';
import { JoinRecord } from '../models/JoinRecord';
import { PersonalInvite } from '../models/PersonalInvite';
import axios from 'axios';

export class InviteTrackingService {
  private inviteCache: Map<string, Map<string, number>> = new Map(); // guildId -> inviteCode -> uses
  private apiUrl: string;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.API_URL || 'http://localhost:3001';
  }

  /**
   * Initialize invite cache for a guild
   */
  async initializeGuild(guild: Guild): Promise<void> {
    try {
      const invites = await guild.invites.fetch();
      const guildCache = new Map<string, number>();

      for (const [code, invite] of invites) {
        guildCache.set(code, invite.uses || 0);
      }

      this.inviteCache.set(guild.id, guildCache);
      console.log(`[InviteTracking] Initialized ${invites.size} invites for guild ${guild.name}`);

      // Also sync with database
      await this.syncInvitesToDatabase(guild, invites);
    } catch (error) {
      console.error(`[InviteTracking] Error initializing guild ${guild.id}:`, error);
    }
  }

  /**
   * Resolve inviterId for an invite code: use PersonalInvite owner if this is a bot-created personal link, else Discord inviter.
   */
  private async resolveInviterId(guildId: string, code: string, discordInviterId: string | null): Promise<string> {
    const personal = await PersonalInvite.findOne({ guildId, inviteCode: code }).lean();
    if (personal) return personal.userId;
    return discordInviterId || '';
  }

  /**
   * Sync invites to database (use PersonalInvite userId for personal links so inviterId is correct).
   */
  private async syncInvitesToDatabase(guild: Guild, invites: Map<string, Invite>): Promise<void> {
    for (const [code, invite] of invites) {
      const inviterId = await this.resolveInviterId(guild.id, code, invite.inviter?.id ?? null);
      if (!inviterId) continue;

      try {
        await InviteModel.findOneAndUpdate(
          { code, guildId: guild.id },
          {
            code,
            inviterId,
            guildId: guild.id,
            uses: invite.uses || 0,
            maxUses: invite.maxUses,
            expiresAt: invite.expiresAt,
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error(`[InviteTracking] Error syncing invite ${code}:`, error);
      }
    }
  }

  /**
   * Public method to sync invites from a guild (for manual sync command)
   */
  async syncGuildInvites(guild: Guild): Promise<{
    total: number;
    synced: number;
    created: number;
    updated: number;
    skipped: number;
  }> {
    const invites = await guild.invites.fetch();
    const guildCache = new Map<string, number>();

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const [code, invite] of invites) {
      const inviterId = await this.resolveInviterId(guild.id, code, invite.inviter?.id ?? null);
      if (!inviterId) {
        skippedCount++;
        continue;
      }

      guildCache.set(code, invite.uses || 0);

      try {
        const inviteData = {
          code,
          inviterId,
          guildId: guild.id,
          uses: invite.uses || 0,
          maxUses: invite.maxUses,
          expiresAt: invite.expiresAt,
        };

        const existingInvite = await InviteModel.findOne({ code, guildId: guild.id });

        if (existingInvite) {
          await InviteModel.findOneAndUpdate(
            { code, guildId: guild.id },
            {
              ...inviteData,
              createdAt: existingInvite.createdAt, // Preserve original creation date
            },
            { new: true }
          );
          updatedCount++;
        } else {
          await InviteModel.create(inviteData);
          createdCount++;
        }

        syncedCount++;
      } catch (error) {
        console.error(`[InviteTracking] Error syncing invite ${code}:`, error);
        skippedCount++;
      }
    }

    // Update cache
    this.inviteCache.set(guild.id, guildCache);

    return {
      total: invites.size,
      synced: syncedCount,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
    };
  }

  /**
   * Clear data from a specific guild (for test server cleanup)
   */
  async clearGuildData(guildId: string): Promise<{
    invitesDeleted: number;
    joinsDeleted: number;
    personalInvitesDeleted: number;
  }> {
    const invitesResult = await InviteModel.deleteMany({ guildId });
    const joinsResult = await JoinRecord.deleteMany({ guildId });
    const personalResult = await PersonalInvite.deleteMany({ guildId });

    // Clear cache
    this.inviteCache.delete(guildId);

    return {
      invitesDeleted: invitesResult.deletedCount,
      joinsDeleted: joinsResult.deletedCount,
      personalInvitesDeleted: personalResult.deletedCount,
    };
  }

  /**
   * Track when a new invite is created (use PersonalInvite owner for inviterId if applicable).
   */
  async trackInviteCreate(invite: Invite): Promise<void> {
    try {
      if (!invite.guild) return;

      const inviterId = await this.resolveInviterId(invite.guild.id, invite.code, invite.inviter?.id ?? null);
      if (!inviterId) return;

      const inviteData = {
        code: invite.code,
        inviterId,
        guildId: invite.guild.id,
        uses: invite.uses || 0,
        maxUses: invite.maxUses,
        expiresAt: invite.expiresAt,
      };

      await InviteModel.findOneAndUpdate(
        { code: invite.code, guildId: invite.guild.id },
        inviteData,
        { upsert: true, new: true }
      );

      const guildCache = this.inviteCache.get(invite.guild.id) || new Map();
      guildCache.set(invite.code, invite.uses || 0);
      this.inviteCache.set(invite.guild.id, guildCache);

      console.log(`[InviteTracking] Tracked new invite: ${invite.code} (inviterId: ${inviterId})`);
    } catch (error) {
      console.error('[InviteTracking] Error tracking invite create:', error);
    }
  }

  /**
   * Track when a member joins the server
   */
  async trackMemberJoin(member: GuildMember): Promise<boolean> {
    try {
      const guild = member.guild;
      const oldCache = this.inviteCache.get(guild.id) || new Map();

      // Fetch current invites
      const currentInvites = await guild.invites.fetch();
      const newCache = new Map<string, number>();

      let usedInvite: Invite | null = null;

      // Find which invite was used by comparing uses
      for (const [code, invite] of currentInvites) {
        const oldUses = oldCache.get(code) || 0;
        const newUses = invite.uses || 0;

        newCache.set(code, newUses);

        // If uses increased, this invite was used
        if (newUses > oldUses) {
          usedInvite = invite;
        }
      }

      // Update cache
      this.inviteCache.set(guild.id, newCache);

      // Only record joins for personal (button-created) invites
      if (usedInvite) {
        const personal = await PersonalInvite.findOne({ guildId: guild.id, inviteCode: usedInvite.code }).lean();
        if (personal) {
          await this.recordJoin(member, usedInvite.code, personal.userId);
          return true;
        } else {
          console.log(`[InviteTracking] Join by ${member.user.username} was not from a personal invite link, skipping track`);
        }
      } else {
        console.log(`[InviteTracking] Could not determine invite for ${member.user.username}, may be vanity/widget invite`);
      }
    } catch (error) {
      console.error('[InviteTracking] Error tracking member join:', error);
    }
    return false;
  }

  /**
   * Record a join in the database and send to API (inviterId = owner of the personal invite).
   */
  private async recordJoin(member: GuildMember, inviteCode: string, inviterId: string): Promise<void> {
    try {
      const userId = member.user.id;
      const guildId = member.guild.id;
      const joinedAt = new Date();

      // Check for duplicate join record (same user, same invite, within 10 seconds)
      const tenSecondsAgo = new Date(joinedAt.getTime() - 10000);
      const existingJoin = await JoinRecord.findOne({
        userId,
        guildId,
        inviteCode,
        joinedAt: { $gte: tenSecondsAgo },
      });

      if (existingJoin) {
        console.log(
          `[InviteTracking] Duplicate join detected for ${member.user.username} (${inviteCode}), skipping...`
        );
        return;
      }

      const joinRecord = {
        userId,
        inviterId,
        inviteCode,
        guildId,
        joinedAt,
        isPersonalInvite: true,
      };

      // Save to database
      await JoinRecord.create(joinRecord);

      // Update invite uses in database (Invite doc has inviterId = owner from PersonalInvite)
      await InviteModel.findOneAndUpdate(
        { code: inviteCode, guildId: member.guild.id },
        { $inc: { uses: 1 } }
      );

      // Send to API if configured
      if (this.apiUrl && this.apiUrl !== 'http://localhost:3001') {
        try {
          await axios.post(`${this.apiUrl}/api/joins`, joinRecord, {
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': process.env.API_SECRET_KEY || '',
            },
          });
        } catch (apiError) {
          console.error('[InviteTracking] Error sending to API:', apiError);
        }
      }

      console.log(
        `[InviteTracking] Recorded join: ${member.user.username} invited by ${inviterId} (${inviteCode})`
      );
    } catch (error) {
      console.error('[InviteTracking] Error recording join:', error);
    }
  }

  /**
   * Get invite statistics for a user
   */
  async getUserStats(guildId: string, userId: string): Promise<{
    totalInvites: number;
    totalJoins: number;
    uniqueUsers: number;
    activeInvites: number;
  }> {
    try {
      const [totalInvites, totalJoins, uniqueUsersResult, activeInvites] = await Promise.all([
        InviteModel.countDocuments({ guildId, inviterId: userId }),
        JoinRecord.countDocuments({ guildId, inviterId: userId, isPersonalInvite: true }),
        // Count unique users (personal invites only)
        JoinRecord.aggregate([
          { $match: { guildId, inviterId: userId, isPersonalInvite: true } },
          {
            $group: {
              _id: '$userId',
            },
          },
          { $count: 'uniqueUsers' },
        ]),
        InviteModel.countDocuments({
          guildId,
          inviterId: userId,
          $and: [
            {
              $or: [
                { maxUses: null },
                { $expr: { $lt: ['$uses', '$maxUses'] } },
              ],
            },
            {
              $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } },
              ],
            },
          ],
        }),
      ]);

      const uniqueUsers = uniqueUsersResult[0]?.uniqueUsers || 0;

      return {
        totalInvites,
        totalJoins,
        uniqueUsers,
        activeInvites,
      };
    } catch (error) {
      console.error('[InviteTracking] Error getting user stats:', error);
      return {
        totalInvites: 0,
        totalJoins: 0,
        uniqueUsers: 0,
        activeInvites: 0,
      };
    }
  }

  /**
   * Get leaderboard of top inviters
   */
  async getLeaderboard(guildId: string, limit: number = 10): Promise<Array<{
    inviterId: string;
    totalJoins: number;
    uniqueUsers: number;
  }>> {
    try {
      // Count unique users per inviter
      const leaderboard = await JoinRecord.aggregate([
        { $match: { guildId, isPersonalInvite: true } },
        // First group: Get unique inviter-user pairs
        {
          $group: {
            _id: {
              inviterId: '$inviterId',
              userId: '$userId',
            },
          },
        },
        // Second group: Count unique users per inviter
        {
          $group: {
            _id: '$_id.inviterId',
            uniqueUsers: { $sum: 1 },
          },
        },
        // Get total joins count for each inviter
        {
          $lookup: {
            from: 'joinrecords',
            let: { inviterId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$inviterId', '$$inviterId'] },
                      { $eq: ['$guildId', guildId] },
                      { $eq: ['$isPersonalInvite', true] },
                    ],
                  },
                },
              },
              { $count: 'total' },
            ],
            as: 'totalJoinsData',
          },
        },
        {
          $addFields: {
            totalJoins: {
              $ifNull: [{ $arrayElemAt: ['$totalJoinsData.total', 0] }, 0],
            },
          },
        },
        { $sort: { uniqueUsers: -1 } },
        { $limit: limit },
      ]);

      return leaderboard.map((item) => ({
        inviterId: item._id,
        totalJoins: item.totalJoins,
        uniqueUsers: item.uniqueUsers,
      }));
    } catch (error) {
      console.error('[InviteTracking] Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get leaderboard for a specific month (top inviters by unique users in that month).
   */
  async getLeaderboardForMonth(
    guildId: string,
    year: number,
    month: number,
    limit: number = 10
  ): Promise<Array<{ inviterId: string; totalJoins: number; uniqueUsers: number }>> {
    try {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);

      const leaderboard = await JoinRecord.aggregate([
        { $match: { guildId, isPersonalInvite: true, joinedAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: {
              inviterId: '$inviterId',
              userId: '$userId',
            },
          },
        },
        {
          $group: {
            _id: '$_id.inviterId',
            uniqueUsers: { $sum: 1 },
          },
        },
        {
          $lookup: {
            from: 'joinrecords',
            let: { inviterId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$inviterId', '$$inviterId'] },
                      { $eq: ['$guildId', guildId] },
                      { $eq: ['$isPersonalInvite', true] },
                      { $gte: ['$joinedAt', start] },
                      { $lte: ['$joinedAt', end] },
                    ],
                  },
                },
              },
              { $count: 'total' },
            ],
            as: 'totalJoinsData',
          },
        },
        {
          $addFields: {
            totalJoins: {
              $ifNull: [{ $arrayElemAt: ['$totalJoinsData.total', 0] }, 0],
            },
          },
        },
        { $sort: { uniqueUsers: -1 } },
        { $limit: limit },
      ]);

      return leaderboard.map((item) => ({
        inviterId: item._id,
        totalJoins: item.totalJoins,
        uniqueUsers: item.uniqueUsers,
      }));
    } catch (error) {
      console.error('[InviteTracking] Error getting monthly leaderboard:', error);
      return [];
    }
  }

  /**
   * Get last 10 invite successes (personal invites only) for the status log.
   */
  async getLast10InviteJoins(
    guildId: string
  ): Promise<Array<{ inviterId: string; joinedAt: Date; userId: string }>> {
    try {
      const records = await JoinRecord.find({ guildId, isPersonalInvite: true })
        .sort({ joinedAt: -1 })
        .limit(10)
        .lean();
      return records.map((r) => ({ inviterId: r.inviterId, joinedAt: r.joinedAt, userId: r.userId }));
    } catch (error) {
      console.error('[InviteTracking] Error getting last 10 invite joins:', error);
      return [];
    }
  }

  /**
   * Get the channel to use for creating invite links (for personal invite button).
   * Uses INVITE_LINK_CHANNEL_ID if set, otherwise guild system channel or first text channel.
   */
  getChannelForInvite(guild: Guild): TextChannel | null {
    const channelId = process.env.INVITE_LINK_CHANNEL_ID;
    if (channelId) {
      const ch = guild.channels.cache.get(channelId);
      if (ch?.isTextBased()) return ch as TextChannel;
    }
    const system = guild.systemChannel;
    if (system?.isTextBased()) return system as TextChannel;
    const first = guild.channels.cache.find((c) => c.isTextBased());
    return (first as TextChannel) || null;
  }

  /**
   * Get existing personal invite for a user in a guild (if any).
   */
  async getPersonalInviteForUser(guildId: string, userId: string): Promise<{ inviteCode: string; url: string } | null> {
    const doc = await PersonalInvite.findOne({ guildId, userId }).lean();
    if (!doc) return null;
    return { inviteCode: doc.inviteCode, url: `https://discord.gg/${doc.inviteCode}` };
  }

  /**
   * Create a personal invite for a user (one per user per guild). Returns the invite URL or null on failure.
   */
  async createPersonalInvite(guild: Guild, userId: string): Promise<{ url: string; code: string } | null> {
    const existing = await PersonalInvite.findOne({ guildId: guild.id, userId });
    if (existing) return null;

    const channel = this.getChannelForInvite(guild);
    if (!channel) {
      console.error('[InviteTracking] No channel available for creating invite');
      return null;
    }

    try {
      const discordInvite = await channel.createInvite({
        maxAge: 0, // no expiry
        maxUses: 0, // unlimited uses
        unique: true,
      });

      await PersonalInvite.create({
        userId,
        guildId: guild.id,
        inviteCode: discordInvite.code,
      });

      await InviteModel.findOneAndUpdate(
        { code: discordInvite.code, guildId: guild.id },
        {
          code: discordInvite.code,
          inviterId: userId,
          guildId: guild.id,
          uses: discordInvite.uses ?? 0,
          maxUses: discordInvite.maxUses,
          expiresAt: discordInvite.expiresAt,
        },
        { upsert: true, new: true }
      );

      const guildCache = this.inviteCache.get(guild.id) || new Map();
      guildCache.set(discordInvite.code, discordInvite.uses ?? 0);
      this.inviteCache.set(guild.id, guildCache);

      return { url: discordInvite.url, code: discordInvite.code };
    } catch (error) {
      console.error('[InviteTracking] Error creating personal invite:', error);
      return null;
    }
  }
}

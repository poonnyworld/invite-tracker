import { Guild, GuildMember, Invite } from 'discord.js';
import { Invite as InviteModel } from '../models/Invite';
import { JoinRecord } from '../models/JoinRecord';
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
   * Sync invites to database
   */
  private async syncInvitesToDatabase(guild: Guild, invites: Map<string, Invite>): Promise<void> {
    for (const [code, invite] of invites) {
      if (!invite.inviter) continue;

      try {
        await InviteModel.findOneAndUpdate(
          { code, guildId: guild.id },
          {
            code,
            inviterId: invite.inviter.id,
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
      if (!invite.inviter) {
        skippedCount++;
        continue;
      }

      guildCache.set(code, invite.uses || 0);

      try {
        const inviteData = {
          code,
          inviterId: invite.inviter.id,
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
  }> {
    const invitesResult = await InviteModel.deleteMany({ guildId });
    const joinsResult = await JoinRecord.deleteMany({ guildId });

    // Clear cache
    this.inviteCache.delete(guildId);

    return {
      invitesDeleted: invitesResult.deletedCount,
      joinsDeleted: joinsResult.deletedCount,
    };
  }

  /**
   * Track when a new invite is created
   */
  async trackInviteCreate(invite: Invite): Promise<void> {
    try {
      if (!invite.guild || !invite.inviter) return;

      const inviteData = {
        code: invite.code,
        inviterId: invite.inviter.id,
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

      // Update cache
      const guildCache = this.inviteCache.get(invite.guild.id) || new Map();
      guildCache.set(invite.code, invite.uses || 0);
      this.inviteCache.set(invite.guild.id, guildCache);

      console.log(`[InviteTracking] Tracked new invite: ${invite.code} by ${invite.inviter.username}`);
    } catch (error) {
      console.error('[InviteTracking] Error tracking invite create:', error);
    }
  }

  /**
   * Track when a member joins the server
   */
  async trackMemberJoin(member: GuildMember): Promise<void> {
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
        if (newUses > oldUses && invite.inviter) {
          usedInvite = invite;
        }
      }

      // Update cache
      this.inviteCache.set(guild.id, newCache);

      // If we found the invite, record the join
      if (usedInvite && usedInvite.inviter) {
        await this.recordJoin(member, usedInvite);
      } else {
        // Could be vanity URL or widget invite - try to detect
        console.log(`[InviteTracking] Could not determine invite for ${member.user.username}, may be vanity/widget invite`);
      }
    } catch (error) {
      console.error('[InviteTracking] Error tracking member join:', error);
    }
  }

  /**
   * Record a join in the database and send to API
   */
  private async recordJoin(member: GuildMember, invite: Invite): Promise<void> {
    try {
      if (!invite.inviter) return;

      const userId = member.user.id;
      const guildId = member.guild.id;
      const inviteCode = invite.code;
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
          `[InviteTracking] Duplicate join detected for ${member.user.username} (${invite.code}), skipping...`
        );
        return;
      }

      const joinRecord = {
        userId,
        inviterId: invite.inviter.id,
        inviteCode,
        guildId,
        joinedAt,
      };

      // Save to database
      await JoinRecord.create(joinRecord);

      // Update invite uses in database
      await InviteModel.findOneAndUpdate(
        { code: invite.code, guildId: member.guild.id },
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
        `[InviteTracking] Recorded join: ${member.user.username} invited by ${invite.inviter.username} (${invite.code})`
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
    activeInvites: number;
  }> {
    try {
      const [totalInvites, totalJoins, activeInvites] = await Promise.all([
        InviteModel.countDocuments({ guildId, inviterId: userId }),
        JoinRecord.countDocuments({ guildId, inviterId: userId }),
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

      return {
        totalInvites,
        totalJoins,
        activeInvites,
      };
    } catch (error) {
      console.error('[InviteTracking] Error getting user stats:', error);
      return {
        totalInvites: 0,
        totalJoins: 0,
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
  }>> {
    try {
      const leaderboard = await JoinRecord.aggregate([
        { $match: { guildId } },
        {
          $group: {
            _id: '$inviterId',
            totalJoins: { $sum: 1 },
          },
        },
        { $sort: { totalJoins: -1 } },
        { $limit: limit },
      ]);

      return leaderboard.map((item) => ({
        inviterId: item._id,
        totalJoins: item.totalJoins,
      }));
    } catch (error) {
      console.error('[InviteTracking] Error getting leaderboard:', error);
      return [];
    }
  }
}

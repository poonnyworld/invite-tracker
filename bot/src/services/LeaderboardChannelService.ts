import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { InviteTrackingService } from './InviteTrackingService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export class LeaderboardChannelService {
  private client: Client;
  private trackingService: InviteTrackingService;
  private leaderboardMessageId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, trackingService: InviteTrackingService) {
    this.client = client;
    this.trackingService = trackingService;
  }

  start(): void {
    const channelId = process.env.INVITE_LEADERBOARD_CHANNEL_ID;
    if (!channelId) {
      console.warn('[LeaderboardChannel] INVITE_LEADERBOARD_CHANNEL_ID not set, leaderboard channel disabled');
      return;
    }

    setTimeout(() => this.updateLeaderboard(), 5000);
    this.updateInterval = setInterval(() => this.updateLeaderboard(), 5 * 60 * 1000);
    console.log('[LeaderboardChannel] Leaderboard channel service started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('[LeaderboardChannel] Leaderboard channel service stopped');
  }

  private formatLeaderboardLines(
    items: Array<{ userId: string; displayName: string; username: string; uniqueUsers: number }>
  ): string {
    return items
      .map((item, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        const nameDisplay =
          item.displayName !== item.username && item.displayName !== 'Unknown User'
            ? `${item.displayName} (@${item.username})`
            : `@${item.username}`;
        return `${medal} <@${item.userId}> **${nameDisplay}** • ${item.uniqueUsers} invites`;
      })
      .join('\n');
  }

  async updateLeaderboard(): Promise<void> {
    try {
      const channelId = process.env.INVITE_LEADERBOARD_CHANNEL_ID;
      if (!channelId) return;

      const channel = (await this.client.channels.fetch(channelId)) as TextChannel;
      if (!channel) {
        console.error('[LeaderboardChannel] Channel not found');
        return;
      }

      const guild = channel.guild;
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [allTime, monthly] = await Promise.all([
        this.trackingService.getLeaderboard(guild.id, 10),
        this.trackingService.getLeaderboardForMonth(guild.id, year, month, 10),
      ]);

      const fetchUserInfo = async (
        list: Array<{ inviterId: string; uniqueUsers: number }>
      ): Promise<Array<{ userId: string; displayName: string; username: string; uniqueUsers: number }>> => {
        return Promise.all(
          list.map(async (item) => {
            try {
              const member = await guild.members.fetch(item.inviterId).catch(() => null);
              const user = member?.user;
              const username = user?.username ?? 'Unknown User';
              const displayName = member?.displayName ?? user?.username ?? username;
              return {
                userId: item.inviterId,
                displayName,
                username,
                uniqueUsers: item.uniqueUsers,
              };
            } catch {
              return {
                userId: item.inviterId,
                displayName: 'Unknown User',
                username: 'Unknown User',
                uniqueUsers: item.uniqueUsers,
              };
            }
          })
        );
      };

      const [allTimeData, monthlyData] = await Promise.all([
        fetchUserInfo(allTime),
        fetchUserInfo(monthly),
      ]);

      const allTimeEmbed = new EmbedBuilder()
        .setTitle('Invite Rankings - All Time (Top 10)')
        .setColor(0x5865f2)
        .setTimestamp(now)
        .setFooter({ text: `Last Updated: ${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` });

      if (allTimeData.length === 0) {
        allTimeEmbed.setDescription('No invite data yet.');
      } else {
        const text = this.formatLeaderboardLines(allTimeData);
        allTimeEmbed.setDescription(text.length > 4096 ? text.substring(0, 4092) + '...' : text);
      }

      const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
      const monthlyEmbed = new EmbedBuilder()
        .setTitle(`Invite Rankings - (${monthLabel}) (Top 10)`)
        .setColor(0x5865f2)
        .setTimestamp(now)
        .setFooter({ text: `Last Updated: ${now.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` });

      if (monthlyData.length === 0) {
        monthlyEmbed.setDescription('No invite data for this month yet.');
      } else {
        const text = this.formatLeaderboardLines(monthlyData);
        monthlyEmbed.setDescription(text.length > 4096 ? text.substring(0, 4092) + '...' : text);
      }

      const payload = { embeds: [allTimeEmbed, monthlyEmbed] };

      if (this.leaderboardMessageId) {
        try {
          const message = await channel.messages.fetch(this.leaderboardMessageId);
          await message.edit(payload);
        } catch {
          const message = await channel.send(payload);
          this.leaderboardMessageId = message.id;
        }
      } else {
        const messages = await channel.messages.fetch({ limit: 10 });
        const existing = messages.find(
          (msg) =>
            msg.author.id === this.client.user?.id &&
            msg.embeds.length >= 1 &&
            msg.embeds[0]?.title?.includes('Invite Rankings')
        );
        if (existing) {
          this.leaderboardMessageId = existing.id;
          await existing.edit(payload);
        } else {
          const message = await channel.send(payload);
          this.leaderboardMessageId = message.id;
        }
      }
    } catch (error) {
      console.error('[LeaderboardChannel] Error updating leaderboard:', error);
    }
  }

  async refresh(): Promise<void> {
    await this.updateLeaderboard();
  }
}

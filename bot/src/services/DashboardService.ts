import { Client, TextChannel, EmbedBuilder } from 'discord.js';
import { InviteTrackingService } from './InviteTrackingService';

export class DashboardService {
  private client: Client;
  private trackingService: InviteTrackingService;
  private dashboardMessageId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, trackingService: InviteTrackingService) {
    this.client = client;
    this.trackingService = trackingService;
  }

  /**
   * Start the dashboard service
   */
  start(): void {
    const channelId = process.env.INVITE_UI_CHANNEL_ID;
    if (!channelId) {
      console.warn('[Dashboard] INVITE_UI_CHANNEL_ID not set, dashboard disabled');
      return;
    }

    // Initial update after 5 seconds
    setTimeout(() => {
      this.updateDashboard();
    }, 5000);

    // Update every 5 minutes
    this.updateInterval = setInterval(() => {
      this.updateDashboard();
    }, 5 * 60 * 1000);

    console.log('[Dashboard] Dashboard service started');
  }

  /**
   * Stop the dashboard service
   */
  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('[Dashboard] Dashboard service stopped');
  }

  /**
   * Update the dashboard message
   */
  async updateDashboard(): Promise<void> {
    try {
      const channelId = process.env.INVITE_UI_CHANNEL_ID;
      if (!channelId) return;

      const channel = (await this.client.channels.fetch(channelId)) as TextChannel;
      if (!channel) {
        console.error('[Dashboard] Channel not found');
        return;
      }

      const guild = channel.guild;
      const leaderboard = await this.trackingService.getLeaderboard(guild.id, 10);

      // Fetch user information for leaderboard
      const leaderboardData = await Promise.all(
        leaderboard.map(async (item) => {
          try {
            const member = await guild.members.fetch(item.inviterId).catch(() => null);
            const user = member?.user;
            const username = user?.username || 'Unknown User';
            const displayName = member?.displayName || user?.displayName || username;
            const userId = item.inviterId;
            
            return {
              username,
              displayName,
              userId,
              totalJoins: item.totalJoins,
              uniqueUsers: item.uniqueUsers,
            };
          } catch {
            return {
              username: 'Unknown User',
              displayName: 'Unknown User',
              userId: item.inviterId,
              totalJoins: item.totalJoins,
              uniqueUsers: item.uniqueUsers,
            };
          }
        })
      );

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('📊 Invite Leaderboard')
        .setDescription('Top 10 users who invited the most members')
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({ text: 'Updates every 5 minutes' });

      if (leaderboardData.length === 0) {
        embed.addFields({
          name: 'No Data',
          value: 'No invite data available yet.',
        });
      } else {
        const leaderboardText = leaderboardData
          .map((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            // Show display name if different from username, otherwise show username
            const nameDisplay = item.displayName !== item.username && item.displayName !== 'Unknown User'
              ? `${item.displayName} (@${item.username})`
              : `@${item.username}`;
            return `${medal} **${nameDisplay}** • ${item.uniqueUsers} invites`;
          })
          .join('\n');

        embed.addFields({
          name: '🏆 Top 10 Inviters',
          value: leaderboardText.length > 1024 
            ? leaderboardText.substring(0, 1020) + '...' 
            : leaderboardText,
        });
      }

      // Get total stats
      const totalInvites = await this.getTotalInvites(guild.id);
      const totalJoins = await this.getTotalJoins(guild.id);

      embed.addFields(
        {
          name: '📈 Total Statistics',
          value: `**Total Invites Created:** ${totalInvites}\n**Total Members Joined:** ${totalJoins}`,
          inline: false,
        }
      );

      // Send or update message
      if (this.dashboardMessageId) {
        try {
          const message = await channel.messages.fetch(this.dashboardMessageId);
          await message.edit({ embeds: [embed] });
        } catch (error) {
          // Message might have been deleted, create new one
          const message = await channel.send({ embeds: [embed] });
          this.dashboardMessageId = message.id;
        }
      } else {
        // Find existing dashboard message or create new one
        const messages = await channel.messages.fetch({ limit: 10 });
        const existingMessage = messages.find((msg) => 
          msg.author.id === this.client.user?.id && 
          msg.embeds[0]?.title === '📊 Invite Leaderboard'
        );

        if (existingMessage) {
          this.dashboardMessageId = existingMessage.id;
          await existingMessage.edit({ embeds: [embed] });
        } else {
          const message = await channel.send({ embeds: [embed] });
          this.dashboardMessageId = message.id;
        }
      }
    } catch (error) {
      console.error('[Dashboard] Error updating dashboard:', error);
    }
  }

  /**
   * Get total invites created
   */
  private async getTotalInvites(guildId: string): Promise<number> {
    try {
      const { Invite } = await import('../models/Invite');
      return await Invite.countDocuments({ guildId });
    } catch (error) {
      console.error('[Dashboard] Error getting total invites:', error);
      return 0;
    }
  }

  /**
   * Get total joins
   */
  private async getTotalJoins(guildId: string): Promise<number> {
    try {
      const { JoinRecord } = await import('../models/JoinRecord');
      return await JoinRecord.countDocuments({ guildId });
    } catch (error) {
      console.error('[Dashboard] Error getting total joins:', error);
      return 0;
    }
  }

  /**
   * Manually trigger dashboard update
   */
  async refresh(): Promise<void> {
    await this.updateDashboard();
  }
}

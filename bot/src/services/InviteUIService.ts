import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { InviteTrackingService } from './InviteTrackingService';

const INVITE_GOAL = 10; // Goal for "Current: X/10" (future reward tier)

const STATUS_LOG_TITLE = 'Status Log - Invite Successes';
const CONTROL_EMBED_TITLE = '⚙️ Invite Controls';

export class InviteUIService {
  private client: Client;
  private trackingService: InviteTrackingService;
  private logMessageId: string | null = null;
  private controlMessageId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(client: Client, trackingService: InviteTrackingService) {
    this.client = client;
    this.trackingService = trackingService;
  }

  start(): void {
    const channelId = process.env.INVITE_UI_CHANNEL_ID;
    if (!channelId) {
      console.warn('[InviteUI] INVITE_UI_CHANNEL_ID not set, invite UI disabled');
      return;
    }

    setTimeout(() => this.initializeAndUpdate(), 5000);
    this.updateInterval = setInterval(() => this.updateStatusLog(), 60 * 1000); // every 1 min
    console.log('[InviteUI] Invite UI service started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('[InviteUI] Invite UI service stopped');
  }

  private async getChannel(): Promise<TextChannel | null> {
    const channelId = process.env.INVITE_UI_CHANNEL_ID;
    if (!channelId) return null;
    const ch = await this.client.channels.fetch(channelId).catch(() => null);
    return ch && (ch as TextChannel).guild ? (ch as TextChannel) : null;
  }

  /**
   * Build control embed with 3 buttons (red accent like Admin Controls).
   */
  private buildControlEmbed(): { embed: EmbedBuilder; row: ActionRowBuilder<ButtonBuilder> } {
    const embed = new EmbedBuilder()
      .setTitle(CONTROL_EMBED_TITLE)
      .setDescription(
        'Use the buttons below only — no need to type commands.\n\n' +
          '• **Check my link** — View your personal invite link (if you have one)\n' +
          '• **Generate invite link** — Create your personal invite link (one per user)\n' +
          '• **How many did I invite** — See how many members you invited (and future reward goals)'
      )
      .setColor(0xed4245) // red accent
      .setFooter({ text: 'Invite Tracker • Use buttons only' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('invite_ui_check_link')
        .setLabel('Check my link')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('generate_invite_link')
        .setLabel('Generate invite link')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('invite_ui_my_count')
        .setLabel('How many did I invite')
        .setStyle(ButtonStyle.Success)
    );

    return { embed, row };
  }

  /**
   * Ensure control message exists; create if not.
   */
  private async ensureControlMessage(channel: TextChannel): Promise<void> {
    if (this.controlMessageId) {
      try {
        await channel.messages.fetch(this.controlMessageId);
        return;
      } catch {
        this.controlMessageId = null;
      }
    }

    const messages = await channel.messages.fetch({ limit: 20 });
    const existing = messages.find(
      (m) =>
        m.author.id === this.client.user?.id &&
        m.embeds[0]?.title === CONTROL_EMBED_TITLE
    );
    if (existing) {
      this.controlMessageId = existing.id;
      return;
    }

    const { embed, row } = this.buildControlEmbed();
    const msg = await channel.send({ embeds: [embed], components: [row] });
    this.controlMessageId = msg.id;
  }

  /**
   * Update or create the Status Log embed (last 10 invite successes).
   */
  async updateStatusLog(): Promise<void> {
    try {
      const channel = await this.getChannel();
      if (!channel) return;

      const guild = channel.guild;
      const joins = await this.trackingService.getLast10InviteJoins(guild.id);

      const lines: string[] = [];
      for (const entry of joins) {
        const member = await guild.members.fetch(entry.inviterId).catch(() => null);
        const username = member?.user?.username ?? 'Unknown';
        const stats = await this.trackingService.getUserStats(guild.id, entry.inviterId);
        const current = stats.uniqueUsers;
        const timeStr = entry.joinedAt.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        lines.push(
          `${timeStr} **${username}** invited +1 member (Current: ${current}/${INVITE_GOAL}) ✅ Ready`
        );
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 ' + STATUS_LOG_TITLE)
        .setDescription(lines.length > 0 ? lines.join('\n') : 'No invite entries from personal links yet.')
        .setColor(0x5865f2)
        .setTimestamp()
        .setFooter({
          text: `Showing last ${joins.length} distributions • ${new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}`,
        });

      if (this.logMessageId) {
        try {
          const msg = await channel.messages.fetch(this.logMessageId);
          await msg.edit({ embeds: [embed] });
        } catch {
          const msg = await channel.send({ embeds: [embed] });
          this.logMessageId = msg.id;
        }
      } else {
        const existing = (await channel.messages.fetch({ limit: 20 })).find(
          (m) =>
            m.author.id === this.client.user?.id &&
            m.embeds[0]?.title?.includes(STATUS_LOG_TITLE)
        );
        if (existing) {
          this.logMessageId = existing.id;
          await existing.edit({ embeds: [embed] });
        } else {
          const msg = await channel.send({ embeds: [embed] });
          this.logMessageId = msg.id;
        }
      }
    } catch (error) {
      console.error('[InviteUI] Error updating status log:', error);
    }
  }

  /**
   * Initialize channel: ensure control message exists, then update log.
   */
  private async initializeAndUpdate(): Promise<void> {
    try {
      const channel = await this.getChannel();
      if (!channel) return;

      await this.ensureControlMessage(channel);
      await this.updateStatusLog();
    } catch (error) {
      console.error('[InviteUI] Error initializing:', error);
    }
  }

  async refresh(): Promise<void> {
    await this.initializeAndUpdate();
  }
}

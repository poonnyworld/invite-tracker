import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { InviteTrackingService } from '../services/InviteTrackingService';

export const data = new SlashCommandBuilder()
  .setName('invite-stats')
  .setDescription('View your invite statistics')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('User to view stats for (defaults to you)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild;

    if (!guild) {
      await interaction.editReply('❌ This command can only be used in a server.');
      return;
    }

    const client = interaction.client;
    const trackingService = (client as any).inviteTrackingService as InviteTrackingService;

    if (!trackingService) {
      await interaction.editReply('❌ Invite tracking service is not initialized.');
      return;
    }

    const stats = await trackingService.getUserStats(guild.id, targetUser.id);

    // Get user's invites
    const { Invite } = await import('../models/Invite');
    const userInvites = await Invite.find({
      guildId: guild.id,
      inviterId: targetUser.id,
    }).sort({ createdAt: -1 }).limit(5);

    const embed = new EmbedBuilder()
      .setTitle(`📊 Invite Statistics - ${targetUser.username}`)
      .setColor(0x5865f2)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        {
          name: '📈 Total Invites Created',
          value: `${stats.totalInvites}`,
          inline: true,
        },
        {
          name: '👥 Total Members Joined',
          value: `${stats.totalJoins}`,
          inline: true,
        },
        {
          name: '✅ Active Invites',
          value: `${stats.activeInvites}`,
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({ text: `Requested by ${interaction.user.username}` });

    if (userInvites.length > 0) {
      const inviteList = userInvites
        .map((invite, index) => {
          const status = invite.maxUses && invite.uses >= invite.maxUses
            ? '🔴'
            : invite.expiresAt && invite.expiresAt < new Date()
            ? '🔴'
            : '🟢';
          return `${status} \`${invite.code}\` - ${invite.uses} uses${invite.maxUses ? `/${invite.maxUses}` : ''}`;
        })
        .join('\n');

      embed.addFields({
        name: '🔗 Recent Invites',
        value: inviteList || 'No invites found',
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('[Stats] Error:', error);
    await interaction.editReply('❌ An error occurred while fetching stats.');
  }
}

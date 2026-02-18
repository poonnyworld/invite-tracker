import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { InviteTrackingService } from '../services/InviteTrackingService';

export const data = new SlashCommandBuilder()
  .setName('sync-invites')
  .setDescription('Sync current server invites to database (Admin only)')
  .addBooleanOption((option) =>
    option
      .setName('clear-test-data')
      .setDescription('Clear data from test server before syncing (default: false)')
      .setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('test-guild-id')
      .setDescription('Test server Guild ID to clear (required if clear-test-data is true)')
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) {
      await interaction.editReply('❌ This command can only be used in a server.');
      return;
    }

    // Check permissions
    const member = await guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.editReply('❌ You need "Manage Server" permission to use this command.');
      return;
    }

    const clearTestData = interaction.options.getBoolean('clear-test-data') || false;
    const testGuildId = interaction.options.getString('test-guild-id');

    if (clearTestData && !testGuildId) {
      await interaction.editReply(
        '❌ `test-guild-id` is required when `clear-test-data` is true.'
      );
      return;
    }

    const client = interaction.client;
    const trackingService = (client as any).inviteTrackingService as InviteTrackingService;

    if (!trackingService) {
      await interaction.editReply('❌ Invite tracking service is not initialized.');
      return;
    }

    // Show progress
    const progressEmbed = new EmbedBuilder()
      .setTitle('🔄 Syncing Invites')
      .setDescription('Fetching invites from server...')
      .setColor(0x5865f2);

    await interaction.editReply({ embeds: [progressEmbed] });

    // Step 1: Clear test server data if requested
    let clearResult = null;
    if (clearTestData && testGuildId) {
      progressEmbed.setDescription(`🗑️ Clearing test server data (Guild ID: ${testGuildId})...`);
      await interaction.editReply({ embeds: [progressEmbed] });

      try {
        clearResult = await trackingService.clearGuildData(testGuildId);
        console.log(
          `[SyncInvites] Cleared test server data: ${clearResult.invitesDeleted} invites, ${clearResult.joinsDeleted} join records`
        );
      } catch (error) {
        console.error('[SyncInvites] Error clearing test data:', error);
        await interaction.editReply({
          embeds: [
            progressEmbed
              .setDescription('❌ Error clearing test server data. Continuing with sync...')
              .setColor(0xff0000),
          ],
        });
      }
    }

    // Step 2: Sync invites from current server
    progressEmbed.setDescription('📥 Fetching and syncing invites from current server...');
    await interaction.editReply({ embeds: [progressEmbed] });

    let syncResult;
    try {
      syncResult = await trackingService.syncGuildInvites(guild);
    } catch (error) {
      console.error('[SyncInvites] Error syncing invites:', error);
      await interaction.editReply({
        embeds: [
          progressEmbed
            .setDescription('❌ Failed to sync invites. Make sure the bot has permission to view invites.')
            .setColor(0xff0000),
        ],
      });
      return;
    }

    // Step 3: Show results
    const resultEmbed = new EmbedBuilder()
      .setTitle('✅ Sync Complete')
      .setDescription(`Successfully synced invites from **${guild.name}**`)
      .setColor(0x00ff00)
      .addFields(
        {
          name: '📊 Sync Statistics',
          value: `**Total Invites:** ${syncResult.total}\n**Synced:** ${syncResult.synced}\n**Created:** ${syncResult.created}\n**Updated:** ${syncResult.updated}\n**Skipped:** ${syncResult.skipped}`,
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({ text: `Synced by ${interaction.user.username}` });

    if (clearTestData && testGuildId && clearResult) {
      resultEmbed.addFields({
        name: '🗑️ Test Server Cleanup',
        value: `✅ Cleared data from test server (Guild ID: ${testGuildId})\n**Invites Deleted:** ${clearResult.invitesDeleted}\n**Join Records Deleted:** ${clearResult.joinsDeleted}`,
        inline: false,
      });
    } else if (clearTestData && testGuildId) {
      resultEmbed.addFields({
        name: '🗑️ Test Server Cleanup',
        value: `⚠️ Failed to clear test server data`,
        inline: false,
      });
    }

    await interaction.editReply({ embeds: [resultEmbed] });

    console.log(
      `[SyncInvites] Sync completed: ${syncResult.synced} invites synced (${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.skipped} skipped)`
    );
  } catch (error) {
    console.error('[SyncInvites] Error:', error);
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('❌ Sync Failed')
          .setDescription('An error occurred while syncing invites.')
          .setColor(0xff0000),
      ],
    });
  }
}

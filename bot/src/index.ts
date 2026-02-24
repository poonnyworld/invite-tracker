import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { connectDB, isDBConnected } from './utils/connectDB';
import { InviteTrackingService } from './services/InviteTrackingService';
import { InviteUIService } from './services/InviteUIService';
import { LeaderboardChannelService } from './services/LeaderboardChannelService';
import { readdirSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Extend the Client type to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

// Create Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Initialize commands collection
client.commands = new Collection();

// Load commands
const loadCommands = async () => {
  const commandsPath = join(__dirname, 'commands');

  try {
    const commandFiles = readdirSync(commandsPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = await import(filePath);

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✓ Loaded command: ${command.data.name}`);
      } else {
        console.warn(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    }
  } catch (error) {
    console.error('Error loading commands:', error);
  }
};

// Load events
const loadEvents = async () => {
  const eventsPath = join(__dirname, 'events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const event = await import(filePath);

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      console.log(`✓ Loaded event: ${event.name}`);
    }
  } catch (error) {
    console.error('Error loading events:', error);
  }
};

// Handle interactions (slash commands and buttons)
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: '❌ This can only be used in a server.', ephemeral: true });
      return;
    }
    const trackingService = (client as any).inviteTrackingService;
    if (!trackingService) {
      await interaction.reply({ content: '❌ Invite tracking is not ready.', ephemeral: true });
      return;
    }
    const userId = interaction.user.id;

    if (interaction.customId === 'invite_ui_check_link') {
      const existing = await trackingService.getPersonalInviteForUser(guild.id, userId);
      await interaction.reply({
        content: existing
          ? `Your personal invite link: ${existing.url}`
          : 'You don\'t have a personal invite link yet. Click "Generate invite link" to create one.',
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId === 'invite_ui_my_count') {
      const stats = await trackingService.getUserStats(guild.id, userId);
      await interaction.reply({
        content: `You have invited **${stats.uniqueUsers}** member(s).`,
        ephemeral: true,
      });
      return;
    }

    if (interaction.customId === 'generate_invite_link') {
      try {
        const existing = await trackingService.getPersonalInviteForUser(guild.id, userId);
        if (existing) {
          await interaction.reply({
            content: `You already created a link. You cannot create another.\nYour link: ${existing.url}`,
            ephemeral: true,
          });
          return;
        }
        const result = await trackingService.createPersonalInvite(guild, userId);
        if (!result) {
          await interaction.reply({
            content: '❌ Could not create invite link (you may already have one, or no channel is available for creating invites).',
            ephemeral: true,
          });
          return;
        }
        await interaction.reply({
          content: `✅ Your personal invite link: ${result.url}\nUse this link so we can track how many people you invite.`,
          ephemeral: true,
        });
      } catch (error) {
        console.error('[generate_invite_link] Error:', error);
        await interaction.reply({
          content: '❌ An error occurred while creating the link.',
          ephemeral: true,
        }).catch(() => {});
      }
      return;
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing ${interaction.commandName}:`, error);

    const errorMessage = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

// When bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✓ Invite Tracker Bot is online as ${readyClient.user.tag}`);
  console.log(`✓ Serving ${readyClient.guilds.cache.size} guild(s)`);

  // Initialize invite tracking service
  const apiUrl = process.env.API_URL;
  const trackingService = new InviteTrackingService(apiUrl);
  (readyClient as any).inviteTrackingService = trackingService;

  // Initialize invite UI (log + control buttons) in INVITE_UI_CHANNEL_ID
  const inviteUIService = new InviteUIService(readyClient, trackingService);
  inviteUIService.start();
  (readyClient as any).inviteUIService = inviteUIService;

  // Initialize leaderboard channel service (INVITE_LEADERBOARD_CHANNEL_ID)
  const leaderboardChannelService = new LeaderboardChannelService(readyClient, trackingService);
  leaderboardChannelService.start();
  (readyClient as any).leaderboardChannelService = leaderboardChannelService;

  // Initialize invite tracking for all guilds
  for (const [guildId, guild] of readyClient.guilds.cache) {
    try {
      await trackingService.initializeGuild(guild);
    } catch (error) {
      console.error(`[Ready] Error initializing guild ${guild.name}:`, error);
    }
  }
});

// Main startup function
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║    Invite Tracker Bot Starting       ║');
  console.log('╚════════════════════════════════════════╝');

  // Connect to database
  await connectDB();

  // Load commands and events
  await loadCommands();
  await loadEvents();

  // Login to Discord
  const token = process.env.DISCORD_TOKEN;

  if (!token) {
    console.error('❌ DISCORD_TOKEN is not defined in environment variables');
    process.exit(1);
  }

  try {
    await client.login(token);
  } catch (error) {
    console.error('❌ Failed to login to Discord:', error);
    process.exit(1);
  }
}

// Start the bot
main();

// Export client for use in other files
export { client };

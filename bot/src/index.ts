import { Client, Collection, GatewayIntentBits, Events } from 'discord.js';
import { connectDB, isDBConnected } from './utils/connectDB';
import { InviteTrackingService } from './services/InviteTrackingService';
import { DashboardService } from './services/DashboardService';
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

// Handle interactions (slash commands)
client.on(Events.InteractionCreate, async (interaction) => {
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

  // Initialize dashboard service
  const dashboardService = new DashboardService(readyClient, trackingService);
  dashboardService.start();
  (readyClient as any).dashboardService = dashboardService;

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

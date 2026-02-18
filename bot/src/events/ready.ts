import { Events, Client } from 'discord.js';
import { InviteTrackingService } from '../services/InviteTrackingService';

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  console.log(`✓ Invite Tracker Bot is online as ${client.user?.tag}`);
  console.log(`✓ Serving ${client.guilds.cache.size} guild(s)`);

  // Initialize invite tracking for all guilds
  const trackingService = new InviteTrackingService();
  
  for (const [guildId, guild] of client.guilds.cache) {
    try {
      await trackingService.initializeGuild(guild);
    } catch (error) {
      console.error(`[Ready] Error initializing guild ${guild.name}:`, error);
    }
  }

  // Store tracking service in client for use in other events
  (client as any).inviteTrackingService = trackingService;
}

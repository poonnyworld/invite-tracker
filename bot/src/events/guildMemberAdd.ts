import { Events, GuildMember } from 'discord.js';
import { InviteTrackingService } from '../services/InviteTrackingService';

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: GuildMember) {
  try {
    // Skip bots
    if (member.user.bot) return;

    const client = member.client;
    const trackingService = (client as any).inviteTrackingService as InviteTrackingService;

    if (!trackingService) {
      console.warn('[GuildMemberAdd] InviteTrackingService not initialized');
      return;
    }

    await trackingService.trackMemberJoin(member);
  } catch (error) {
    console.error('[GuildMemberAdd] Error:', error);
  }
}

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

    const recorded = await trackingService.trackMemberJoin(member);
    if (recorded) {
      const inviteUI = (client as any).inviteUIService;
      if (inviteUI && typeof inviteUI.updateStatusLog === 'function') {
        inviteUI.updateStatusLog().catch((err: Error) => console.error('[GuildMemberAdd] Error updating invite log:', err));
      }
    }
  } catch (error) {
    console.error('[GuildMemberAdd] Error:', error);
  }
}

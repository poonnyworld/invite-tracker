import { Events, Invite } from 'discord.js';
import { InviteTrackingService } from '../services/InviteTrackingService';

export const name = Events.InviteCreate;
export const once = false;

export async function execute(invite: Invite) {
  try {
    const client = invite.client;
    const trackingService = (client as any).inviteTrackingService as InviteTrackingService;

    if (!trackingService) {
      console.warn('[InviteCreate] InviteTrackingService not initialized');
      return;
    }

    await trackingService.trackInviteCreate(invite);
  } catch (error) {
    console.error('[InviteCreate] Error:', error);
  }
}

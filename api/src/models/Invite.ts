import mongoose, { Document, Schema } from 'mongoose';

export interface IInvite extends Document {
  code: string;
  inviterId: string;
  guildId: string;
  uses: number;
  maxUses: number | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    inviterId: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    uses: {
      type: Number,
      default: 0,
    },
    maxUses: {
      type: Number,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

InviteSchema.index({ guildId: 1, inviterId: 1 });
InviteSchema.index({ guildId: 1, code: 1 });

export const Invite = mongoose.model<IInvite>('Invite', InviteSchema);

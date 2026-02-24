import mongoose, { Document, Schema } from 'mongoose';

export interface IPersonalInvite extends Document {
  userId: string;
  guildId: string;
  inviteCode: string;
  createdAt: Date;
}

const PersonalInviteSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

PersonalInviteSchema.index({ guildId: 1, userId: 1 }, { unique: true });
PersonalInviteSchema.index({ guildId: 1, inviteCode: 1 });

export const PersonalInvite = mongoose.model<IPersonalInvite>('PersonalInvite', PersonalInviteSchema);

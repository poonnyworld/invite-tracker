import mongoose, { Document, Schema } from 'mongoose';

export interface IJoinRecord extends Document {
  userId: string;
  inviterId: string;
  inviteCode: string;
  guildId: string;
  joinedAt: Date;
  createdAt: Date;
}

const JoinRecordSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    inviterId: {
      type: String,
      required: true,
      index: true,
    },
    inviteCode: {
      type: String,
      required: true,
      index: true,
    },
    guildId: {
      type: String,
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

JoinRecordSchema.index({ guildId: 1, inviterId: 1 });
JoinRecordSchema.index({ guildId: 1, userId: 1 });
JoinRecordSchema.index({ inviterId: 1, joinedAt: -1 });

export const JoinRecord = mongoose.model<IJoinRecord>('JoinRecord', JoinRecordSchema);

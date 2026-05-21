import { Schema, model, models } from "mongoose";

const InvestmentSchema = new Schema(
  {
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    assetCode: { type: String, required: true },
    issuer: { type: String, required: true },
    investingPublicKey: { type: String, required: false },
    tokensInvested: { type: Number, default: 0 },
    investedAt: { type: Date, default: Date.now },
    lastRewardAt: { type: Date, default: Date.now },
    accumulatedReward: { type: Number, default: 0 },
  },
  { _id: false },
);

const TrustlineSchema = new Schema(
  {
    companyId: { type: String, required: true },
    confirmed: { type: Boolean, default: false },
    lastCheckedAt: { type: Date, required: false },
  },
  { _id: false },
);

const UserSchema = new Schema(
  {
    telegramId: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true, unique: true, index: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: { type: String, required: true },
    verificationExpiry: { type: Date, required: true },
    telegramUsername: { type: String, required: false },
    telegramFirstName: { type: String, required: false },
    telegramPhotoUrl: { type: String, required: false },
    growBalance: { type: Number, default: 1000 },
    chainGrowBalance: { type: Number, default: 0 },
    chainGrowBalanceUpdatedAt: { type: Date, required: false },
    totalInvested: { type: Number, default: 0 },
    lastBalanceSyncAt: { type: Date, required: false },
    investments: { type: [InvestmentSchema], default: [] },
    trustlines: { type: [TrustlineSchema], default: [] },
  },
  { timestamps: true },
);

UserSchema.index({ isVerified: 1, chainGrowBalance: -1 });

export type Investment = {
  companyId: string;
  companyName: string;
  assetCode: string;
  issuer: string;
  investingPublicKey?: string;
  tokensInvested: number;
  investedAt: Date;
  lastRewardAt: Date;
  accumulatedReward: number;
  walletAssetBalance?: number;
  rewardsEligible?: boolean;
  pausedReason?: string | null;
};

export type UserDoc = {
  telegramId: string;
  publicKey: string;
  isVerified: boolean;
  verificationCode: string;
  verificationExpiry: Date;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramPhotoUrl?: string;
  growBalance: number;
  chainGrowBalance: number;
  chainGrowBalanceUpdatedAt?: Date;
  totalInvested: number;
  lastBalanceSyncAt?: Date;
  investments: Investment[];
  trustlines: { companyId: string; confirmed: boolean; lastCheckedAt?: Date }[];
  createdAt?: Date;
  updatedAt?: Date;
};

export const User = models.User || model("User", UserSchema);

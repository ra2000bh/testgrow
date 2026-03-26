import { Schema, model, models } from "mongoose";

const InvestmentSchema = new Schema(
  {
    companyId: { type: String, required: true },
    companyName: { type: String, required: true },
    assetCode: { type: String, required: true },
    issuer: { type: String, required: true },
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
    growBalance: { type: Number, default: 1000 },
    totalInvested: { type: Number, default: 0 },
    investments: { type: [InvestmentSchema], default: [] },
    trustlines: { type: [TrustlineSchema], default: [] },
  },
  { timestamps: true },
);

export type Investment = {
  companyId: string;
  companyName: string;
  assetCode: string;
  issuer: string;
  tokensInvested: number;
  investedAt: Date;
  lastRewardAt: Date;
  accumulatedReward: number;
};

export type UserDoc = {
  telegramId: string;
  publicKey: string;
  isVerified: boolean;
  verificationCode: string;
  verificationExpiry: Date;
  growBalance: number;
  totalInvested: number;
  investments: Investment[];
  trustlines: { companyId: string; confirmed: boolean }[];
};

export const User = models.User || model("User", UserSchema);

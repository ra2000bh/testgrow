import { Schema, model, models } from "mongoose";

const PricePointSchema = new Schema(
  {
    t: { type: String, required: true },
    v: { type: Number, required: true },
  },
  { _id: false },
);

const MarketPriceSchema = new Schema(
  {
    symbol: { type: String, required: true, unique: true, index: true },
    priceUsd: { type: Number, required: true },
    history: { type: [PricePointSchema], default: [] },
    lastTickAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const MarketPrice = models.MarketPrice || model("MarketPrice", MarketPriceSchema);

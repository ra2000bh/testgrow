import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isValidStellarPublicKey } from "@/lib/stellar";

const schema = z.object({
  telegramId: z.string().min(1),
  publicKey: z.string().min(56).max(56),
});

function generateVerificationCode() {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

export async function POST(request: NextRequest) {
  try {
    const payload = schema.parse(await request.json());

    if (!isValidStellarPublicKey(payload.publicKey)) {
      return NextResponse.json({ message: "Invalid Stellar public key format." }, { status: 400 });
    }

    await connectToDatabase();
    let user = await User.findOne({ $or: [{ telegramId: payload.telegramId }, { publicKey: payload.publicKey }] });
    if (!user) {
      user = await User.create({
        telegramId: payload.telegramId,
        publicKey: payload.publicKey,
        verificationCode: generateVerificationCode(),
        verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    return NextResponse.json({
      verificationCode: user.verificationCode,
      memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY,
      isVerified: user.isVerified,
    });
  } catch {
    return NextResponse.json({ message: "Unable to register wallet right now." }, { status: 500 });
  }
}

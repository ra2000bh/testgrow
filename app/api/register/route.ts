import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { isValidStellarPublicKey } from "@/lib/stellar";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";

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
      return NextResponse.json(
        { message: "Invalid Stellar public key format." },
        { status: 400, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await connectToDatabase();

    const byTelegram = await User.findOne({ telegramId: payload.telegramId });
    if (byTelegram) {
      const keyTaken = await User.findOne({
        publicKey: payload.publicKey,
        telegramId: { $ne: payload.telegramId },
      });
      if (keyTaken) {
        return NextResponse.json(
          { message: "This Stellar address is already linked to another account." },
          { status: 409, headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      if (byTelegram.publicKey === payload.publicKey) {
        if (byTelegram.isVerified) {
          return NextResponse.json(
            {
              verificationCode: byTelegram.verificationCode,
              memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY,
              isVerified: true,
            },
            { headers: CACHE_PRIVATE_NO_STORE },
          );
        }
        return NextResponse.json(
          {
            verificationCode: byTelegram.verificationCode,
            memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY,
            isVerified: false,
          },
          { headers: CACHE_PRIVATE_NO_STORE },
        );
      }
      byTelegram.publicKey = payload.publicKey;
      byTelegram.verificationCode = generateVerificationCode();
      byTelegram.verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      byTelegram.isVerified = false;
      await byTelegram.save();
      return NextResponse.json(
        {
          verificationCode: byTelegram.verificationCode,
          memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY,
          isVerified: false,
        },
        { headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const byKey = await User.findOne({ publicKey: payload.publicKey });
    if (byKey) {
      return NextResponse.json(
        { message: "This Stellar address is already registered." },
        { status: 409, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    const user = await User.create({
      telegramId: payload.telegramId,
      publicKey: payload.publicKey,
      verificationCode: generateVerificationCode(),
      verificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    return NextResponse.json(
      {
        verificationCode: user.verificationCode,
        memoWallet: process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY,
        isVerified: user.isVerified,
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to register wallet right now." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}

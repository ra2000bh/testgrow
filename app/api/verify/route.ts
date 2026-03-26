import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { findVerificationPayment } from "@/lib/stellar";

const schema = z.object({
  telegramId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId } = schema.parse(await request.json());
    await connectToDatabase();
    const user = await User.findOne({ telegramId });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (new Date(user.verificationExpiry).getTime() < Date.now()) {
      return NextResponse.json({ success: false, message: "Verification code expired." }, { status: 400 });
    }

    const memoWallet = process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY;
    if (!memoWallet) {
      return NextResponse.json({ success: false, message: "Memo wallet not configured." }, { status: 500 });
    }

    let found = false;
    const deadline = Date.now() + 30_000;
    while (!found && Date.now() < deadline) {
      found = await findVerificationPayment({
        sourcePublicKey: user.publicKey,
        memoWalletPublicKey: memoWallet,
        memoCode: user.verificationCode,
      });
      if (!found) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (!found) {
      return NextResponse.json({
        success: false,
        message: "We couldn't find your payment yet. Please wait a moment and try again.",
      });
    }

    user.isVerified = true;
    await user.save();
    return NextResponse.json({ success: true, message: "Wallet verified successfully." });
  } catch {
    return NextResponse.json({ success: false, message: "Verification failed. Please retry." }, { status: 500 });
  }
}

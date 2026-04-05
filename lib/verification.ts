import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { findVerificationPayment } from "@/lib/stellar";

export type VerifyAttemptResult =
  | { kind: "verified" }
  | { kind: "pending" }
  | { kind: "error"; message: string };

export async function tryVerifyUserByPayment(telegramId: string): Promise<VerifyAttemptResult> {
  await connectToDatabase();
  const user = await User.findOne({ telegramId });

  if (!user) {
    return { kind: "error", message: "User not found." };
  }
  if (user.isVerified) {
    return { kind: "verified" };
  }
  if (new Date(user.verificationExpiry).getTime() < Date.now()) {
    return { kind: "error", message: "Verification code expired." };
  }

  const memoWallet = process.env.STELLAR_MEMO_WALLET_PUBLIC_KEY;
  if (!memoWallet) {
    return { kind: "error", message: "Memo wallet not configured." };
  }

  const found = await findVerificationPayment({
    sourcePublicKey: user.publicKey,
    memoWalletPublicKey: memoWallet,
    memoCode: user.verificationCode,
  });

  if (!found) {
    return { kind: "pending" };
  }

  user.isVerified = true;
  await user.save();
  return { kind: "verified" };
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

const schema = z.object({
  telegramId: z.string().min(1),
  companyId: z.string().min(1),
  confirmed: z.boolean(),
});

export async function POST(request: NextRequest) {
  try {
    const { telegramId, companyId, confirmed } = schema.parse(await request.json());
    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified" },
        { status: 403 },
      );
    }

    const trustline = user.trustlines.find((t: { companyId: string }) => t.companyId === companyId);
    if (trustline) {
      trustline.confirmed = confirmed;
    } else {
      user.trustlines.push({ companyId, confirmed });
    }

    await user.save();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to save trustline status." }, { status: 500 });
  }
}

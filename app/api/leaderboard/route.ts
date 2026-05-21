import { NextRequest, NextResponse } from "next/server";
import { readTelegramIdFromSession } from "@/lib/auth-session";
import { CACHE_PRIVATE_NO_STORE } from "@/lib/http-cache";
import { getRankForTelegramId, leaderboardBonusPercent } from "@/lib/leaderboard";
import {
  buildLeaderboardSnapshotForViewer,
  refreshLeaderboardBalancesIfStale,
} from "@/lib/leaderboard-balance";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    const telegramId = readTelegramIdFromSession(request);
    if (!telegramId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ telegramId });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found." },
        { status: 404, headers: CACHE_PRIVATE_NO_STORE },
      );
    }
    if (!user.isVerified) {
      return NextResponse.json(
        { success: false, message: "Wallet not verified" },
        { status: 403, headers: CACHE_PRIVATE_NO_STORE },
      );
    }

    await refreshLeaderboardBalancesIfStale();
    const snapshot = await buildLeaderboardSnapshotForViewer(telegramId, { refreshStale: false });
    const viewerRank = getRankForTelegramId(snapshot, telegramId);
    const viewerEntry = snapshot.entries.find((e) => e.isYou);

    return NextResponse.json(
      {
        success: true,
        entries: snapshot.entries,
        viewer: {
          rank: viewerRank,
          bonusPercent: leaderboardBonusPercent(viewerRank),
          growBalance: viewerEntry?.growBalance ?? Math.max(0, Number(user.chainGrowBalance) || 0),
        },
        refreshedAt: snapshot.refreshedAt.toISOString(),
      },
      { headers: CACHE_PRIVATE_NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load leaderboard." },
      { status: 500, headers: CACHE_PRIVATE_NO_STORE },
    );
  }
}

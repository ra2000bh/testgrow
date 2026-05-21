import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLeaderboardSnapshot,
  combinedRewardMultiplier,
  getRankForTelegramId,
  leaderboardBonusPercent,
  maskDisplayName,
  resolveDisplayName,
  sortLeaderboardCandidates,
  type LeaderboardCandidate,
} from "./leaderboard";

describe("maskDisplayName", () => {
  it("masks 3–4 char names with first char only", () => {
    assert.equal(maskDisplayName("Ann"), "A•••");
    assert.equal(maskDisplayName("Joey"), "J•••");
  });

  it("masks 5+ char names with first and last", () => {
    assert.equal(maskDisplayName("Alice"), "A•••e");
    assert.equal(maskDisplayName("Jonathan"), "J•••n");
  });

  it("handles empty", () => {
    assert.equal(maskDisplayName(""), "•••");
    assert.equal(maskDisplayName("  "), "•••");
  });
});

describe("resolveDisplayName", () => {
  it("prefers username then first name", () => {
    assert.equal(resolveDisplayName({ telegramUsername: "alice_b" }), "alice_b");
    assert.equal(resolveDisplayName({ telegramFirstName: "Bob" }), "Bob");
  });

  it("uses telegramId instead of Player when profile missing", () => {
    assert.equal(resolveDisplayName({ telegramId: "482910384" }), "482910384");
    assert.notEqual(maskDisplayName(resolveDisplayName({ telegramId: "482910384" })), "P•••r");
  });
});

describe("leaderboardBonusPercent", () => {
  it("returns tier bonuses", () => {
    assert.equal(leaderboardBonusPercent(1), 50);
    assert.equal(leaderboardBonusPercent(2), 40);
    assert.equal(leaderboardBonusPercent(3), 30);
    assert.equal(leaderboardBonusPercent(4), 10);
    assert.equal(leaderboardBonusPercent(10), 10);
    assert.equal(leaderboardBonusPercent(11), 0);
    assert.equal(leaderboardBonusPercent(null), 0);
  });
});

describe("combinedRewardMultiplier", () => {
  it("matches additive example: 10 SEED + rank 1", () => {
    const mult = combinedRewardMultiplier(10, 1);
    assert.equal(mult, 1.6);
    const perBatch = 100 * 0.52 * mult;
    assert.ok(Math.abs(perBatch - 83.2) < 1e-9);
  });
});

describe("rank displacement", () => {
  const base = (id: string, bal: number): LeaderboardCandidate => ({
    telegramId: id,
    chainGrowBalance: bal,
    createdAt: new Date("2024-01-01"),
  });

  it("swaps bonus when balances overtake", () => {
    const a = base("a", 100);
    const b = base("b", 50);
    const snap1 = buildLeaderboardSnapshot([a, b], "a");
    assert.equal(getRankForTelegramId(snap1, "a"), 1);
    assert.equal(leaderboardBonusPercent(getRankForTelegramId(snap1, "b")), 40);

    const snap2 = buildLeaderboardSnapshot([base("b", 200), a], "a");
    assert.equal(getRankForTelegramId(snap2, "a"), 2);
    assert.equal(leaderboardBonusPercent(getRankForTelegramId(snap2, "a")), 40);
    assert.equal(getRankForTelegramId(snap2, "b"), 1);
    assert.equal(leaderboardBonusPercent(getRankForTelegramId(snap2, "b")), 50);
  });

  it("sorts by balance then createdAt", () => {
    const sorted = sortLeaderboardCandidates([
      { telegramId: "z", chainGrowBalance: 10, createdAt: new Date("2025-01-01") },
      { telegramId: "a", chainGrowBalance: 10, createdAt: new Date("2024-01-01") },
      { telegramId: "m", chainGrowBalance: 20 },
    ]);
    assert.equal(sorted[0]?.telegramId, "m");
    assert.equal(sorted[1]?.telegramId, "a");
    assert.equal(sorted[2]?.telegramId, "z");
  });
});

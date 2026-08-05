import { describe, expect, it } from "vitest";
import {
  filterLeaderboardForViewer,
  isLeaderboardPeer,
  rankLeaderboardEntry,
  viewerSeesFullLeaderboard,
} from "@/lib/leaderboard-utils";

const sample = [
  { id: "1", full_name: "President", roles: ["president"], contributionScore: 200 },
  { id: "2", full_name: "Tech Head", roles: ["technical_head"], contributionScore: 150 },
  { id: "3", full_name: "Alice", roles: ["member"], contributionScore: 120 },
  { id: "4", full_name: "Bob", roles: ["member"], contributionScore: 80 },
];

describe("leaderboard-utils", () => {
  it("identifies peer members vs leadership", () => {
    expect(isLeaderboardPeer(["member"])).toBe(true);
    expect(isLeaderboardPeer(["president"])).toBe(false);
    expect(isLeaderboardPeer(["member", "technical_head"])).toBe(false);
    expect(isLeaderboardPeer([])).toBe(true);
  });

  it("grants full leaderboard to leadership roles only", () => {
    expect(viewerSeesFullLeaderboard(["member"])).toBe(false);
    expect(viewerSeesFullLeaderboard(["secretary"])).toBe(true);
    expect(viewerSeesFullLeaderboard(["student_lead"])).toBe(true);
  });

  it("filters leaderboard for regular members", () => {
    const filtered = filterLeaderboardForViewer(sample, ["member"]);
    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => isLeaderboardPeer(e.roles))).toBe(true);
    expect(filtered.map((e) => e.id)).toEqual(["3", "4"]);
  });

  it("shows full leaderboard to leadership viewers", () => {
    const filtered = filterLeaderboardForViewer(sample, ["president"]);
    expect(filtered).toHaveLength(4);
  });

  it("ranks entries correctly", () => {
    const peers = filterLeaderboardForViewer(sample, ["member"]);
    expect(rankLeaderboardEntry(peers, "3")).toBe(1);
    expect(rankLeaderboardEntry(peers, "4")).toBe(2);
    expect(rankLeaderboardEntry(peers, "1")).toBe(0);
  });
});

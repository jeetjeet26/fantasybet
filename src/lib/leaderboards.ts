import { DAILY_CREDITS } from "@/lib/odds";
import type { DailyResult } from "@/lib/types/database";

type ProfileSummary = { display_name: string } | null;

type DailyResultLike = Pick<
  DailyResult,
  "user_id" | "total_wagered" | "total_won" | "wins" | "losses" | "pushes"
> & {
  profiles?: ProfileSummary;
};

export interface DailyLeaderboardRow {
  user_id: string;
  placement: number;
  bankedCredits: number;
  totalWagered: number;
  wins: number;
  losses: number;
  pushes: number;
  profiles: ProfileSummary;
}

export interface WeeklyLeaderboardRow {
  user_id: string;
  placement: number;
  bankedCredits: number;
  totalWins: number;
  totalLosses: number;
  activeDays: number;
  scoredDays: number;
  profiles: ProfileSummary;
}

export function rankDailyResults(results: DailyResultLike[]): DailyLeaderboardRow[] {
  return results
    .map((result) => ({
      user_id: result.user_id,
      placement: 0,
      bankedCredits: roundCredits(Number(result.total_won)),
      totalWagered: roundCredits(Number(result.total_wagered)),
      wins: result.wins,
      losses: result.losses,
      pushes: result.pushes,
      profiles: result.profiles ?? null,
    }))
    .sort((a, b) => {
      if (b.bankedCredits !== a.bankedCredits) return b.bankedCredits - a.bankedCredits;
      const activeBetDiff = Number(b.totalWagered > 0) - Number(a.totalWagered > 0);
      if (activeBetDiff !== 0) return activeBetDiff;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      if (b.pushes !== a.pushes) return b.pushes - a.pushes;
      return a.user_id.localeCompare(b.user_id);
    })
    .map((result, index) => ({
      ...result,
      placement: index + 1,
    }));
}

export function rankWeeklyResults(results: DailyResultLike[]): WeeklyLeaderboardRow[] {
  const weeklyByUser = new Map<string, Omit<WeeklyLeaderboardRow, "placement">>();

  for (const result of results) {
    const existing = weeklyByUser.get(result.user_id);
    if (existing) {
      existing.bankedCredits = roundCredits(existing.bankedCredits + Number(result.total_won));
      existing.totalWins += result.wins;
      existing.totalLosses += result.losses;
      existing.activeDays += Number(Number(result.total_wagered) > 0);
      existing.scoredDays += 1;
      continue;
    }

    weeklyByUser.set(result.user_id, {
      user_id: result.user_id,
      bankedCredits: roundCredits(Number(result.total_won)),
      totalWins: result.wins,
      totalLosses: result.losses,
      activeDays: Number(Number(result.total_wagered) > 0),
      scoredDays: 1,
      profiles: result.profiles ?? null,
    });
  }

  return [...weeklyByUser.values()]
    .sort((a, b) => {
      if (b.bankedCredits !== a.bankedCredits) return b.bankedCredits - a.bankedCredits;
      if (b.activeDays !== a.activeDays) return b.activeDays - a.activeDays;
      if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
      if (a.totalLosses !== b.totalLosses) return a.totalLosses - b.totalLosses;
      return a.user_id.localeCompare(b.user_id);
    })
    .map((result, index) => ({
      ...result,
      placement: index + 1,
    }));
}

export function isAboveStartingBankroll(bankedCredits: number, scoredDays = 1) {
  return bankedCredits >= DAILY_CREDITS * scoredDays;
}

function roundCredits(value: number) {
  return Math.round(value * 100) / 100;
}

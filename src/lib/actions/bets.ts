"use server";

import { createClient } from "@/lib/supabase/server";
import { calculatePayout, DAILY_CREDITS } from "@/lib/odds";
import type { BetType, BetPick } from "@/lib/types/database";

interface PlaceBetInput {
  leagueId: string;
  slateGameId: string;
  betType: BetType;
  betPick: BetPick;
  amount: number;
  odds: number;
}

export async function placeBet(input: PlaceBetInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (input.amount <= 0) return { error: "Bet amount must be positive" };

  const { data: game, error: gameError } = await supabase
    .from("slate_games")
    .select("*")
    .eq("id", input.slateGameId)
    .single();

  if (gameError || !game) return { error: "Game not found" };
  if (game.status !== "upcoming") return { error: "This game has already started" };
  if (new Date(game.commence_time).getTime() <= Date.now()) {
    return { error: "Betting is closed for this game" };
  }

  const today = new Date().toISOString().split("T")[0];

  const { data: slate } = await supabase
    .from("daily_slates")
    .select("id")
    .eq("league_id", input.leagueId)
    .eq("date", today)
    .maybeSingle();

  if (!slate) return { error: "No slate for today in this league" };
  if (game.slate_id !== slate.id) return { error: "Game is not part of this league's slate" };

  const { data: slateGames } = await supabase
    .from("slate_games")
    .select("id")
    .eq("slate_id", slate.id);

  const leagueSlateGameIds = (slateGames ?? []).map((g) => g.id);

  const { data: todaysBets } = await supabase
    .from("bets")
    .select("amount, slate_game_id")
    .eq("user_id", user.id);

  const todayTotal = (todaysBets ?? [])
    .filter((b) => leagueSlateGameIds.includes(b.slate_game_id))
    .reduce((sum, b) => sum + Number(b.amount), 0);

  if (todayTotal + input.amount > DAILY_CREDITS) {
    return { error: `Exceeds daily credit limit. You have ${DAILY_CREDITS - todayTotal} credits remaining.` };
  }

  const potentialPayout = calculatePayout(input.amount, input.odds);

  const { error } = await supabase.from("bets").insert({
    user_id: user.id,
    slate_game_id: input.slateGameId,
    bet_type: input.betType,
    bet_pick: input.betPick,
    amount: input.amount,
    odds: input.odds,
    potential_payout: potentialPayout,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export interface DailyBetSlipItem {
  id: string;
  amount: number;
  odds: number;
  potentialPayout: number;
  payout: number;
  result: "pending" | "won" | "lost" | "push";
  betType: BetType;
  betPick: BetPick;
  createdAt: string;
  game: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    commenceTime: string;
    status: "upcoming" | "live" | "settled" | "cancelled";
    homeScore: number | null;
    awayScore: number | null;
  };
}

export interface DailyBetSlipSummary {
  totalBets: number;
  pendingBets: number;
  wins: number;
  losses: number;
  pushes: number;
  totalWagered: number;
  settledWagered: number;
  settledPayout: number;
  settledNet: number;
}

export interface DailyBetSlipResponse {
  leagueId: string;
  slateId: string | null;
  items: DailyBetSlipItem[];
  summary: DailyBetSlipSummary;
  updatedAt: string;
  error?: string;
}

function emptySlip(leagueId: string): DailyBetSlipResponse {
  return {
    leagueId,
    slateId: null,
    items: [],
    summary: {
      totalBets: 0,
      pendingBets: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalWagered: 0,
      settledWagered: 0,
      settledPayout: 0,
      settledNet: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

async function fetchDailyBetSlip(leagueId: string): Promise<DailyBetSlipResponse> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ...emptySlip(leagueId), error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];
  const { data: slate } = await supabase
    .from("daily_slates")
    .select("id")
    .eq("league_id", leagueId)
    .eq("date", today)
    .maybeSingle();

  if (!slate) return emptySlip(leagueId);

  const { data: gamesData } = await supabase
    .from("slate_games")
    .select("id, home_team, away_team, commence_time, status, home_score, away_score")
    .eq("slate_id", slate.id)
    .order("commence_time", { ascending: true });

  const games = gamesData ?? [];
  if (games.length === 0) {
    return {
      ...emptySlip(leagueId),
      slateId: slate.id,
    };
  }

  const gameIds = games.map((g) => g.id);
  const { data: betsData } = await supabase
    .from("bets")
    .select("id, amount, odds, potential_payout, payout, result, bet_type, bet_pick, created_at, slate_game_id")
    .eq("user_id", user.id)
    .in("slate_game_id", gameIds)
    .order("created_at", { ascending: false });

  const gameMap = new Map(games.map((g) => [g.id, g]));
  const items: DailyBetSlipItem[] = (betsData ?? [])
    .map((bet) => {
      const game = gameMap.get(bet.slate_game_id);
      if (!game) return null;
      return {
        id: bet.id,
        amount: Number(bet.amount),
        odds: bet.odds,
        potentialPayout: Number(bet.potential_payout),
        payout: Number(bet.payout),
        result: bet.result,
        betType: bet.bet_type,
        betPick: bet.bet_pick,
        createdAt: bet.created_at,
        game: {
          id: game.id,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          commenceTime: game.commence_time,
          status: game.status,
          homeScore: game.home_score,
          awayScore: game.away_score,
        },
      };
    })
    .filter((item): item is DailyBetSlipItem => item !== null);

  const summary = items.reduce<DailyBetSlipSummary>(
    (acc, item) => {
      acc.totalBets += 1;
      acc.totalWagered += item.amount;

      if (item.result === "pending") {
        acc.pendingBets += 1;
      } else {
        acc.settledWagered += item.amount;
        acc.settledPayout += item.payout;
      }

      if (item.result === "won") acc.wins += 1;
      if (item.result === "lost") acc.losses += 1;
      if (item.result === "push") acc.pushes += 1;
      return acc;
    },
    {
      totalBets: 0,
      pendingBets: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      totalWagered: 0,
      settledWagered: 0,
      settledPayout: 0,
      settledNet: 0,
    }
  );

  summary.settledNet = summary.settledPayout - summary.settledWagered;

  return {
    leagueId,
    slateId: slate.id,
    items,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

export async function getDailyBetSlip(leagueId: string): Promise<DailyBetSlipResponse> {
  return fetchDailyBetSlip(leagueId);
}

export async function refreshDailyBetSlip(leagueId: string): Promise<DailyBetSlipResponse> {
  const supabase = await createClient();

  // Best-effort live scoring trigger. Even if this fails, we still return latest known state.
  try {
    await supabase.functions.invoke("settle-bets");
  } catch {
    // no-op
  }

  return fetchDailyBetSlip(leagueId);
}

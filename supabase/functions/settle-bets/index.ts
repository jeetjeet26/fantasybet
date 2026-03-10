// Supabase Edge Function: settle-bets
// Runs periodically to check completed games and settle bets
// Deploy with: supabase functions deploy settle-bets

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const ODDS_API_KEY = Deno.env.get("THE_ODDS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ScoreEvent {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  completed: boolean;
  scores: { name: string; score: string }[] | null;
}

const MAX_SCORE_LOOKBACK_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const PLACEMENT_POINTS: Record<number, number> = {
  1: 10, 2: 8, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2,
};

function getPoints(place: number): number {
  return PLACEMENT_POINTS[place] ?? 1;
}

function calcPayout(wager: number, odds: number): number {
  if (odds > 0) return Math.round((wager + wager * odds / 100) * 100) / 100;
  return Math.round((wager + wager * 100 / Math.abs(odds)) * 100) / 100;
}

function getWeekStartDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;

  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
}

function getWeekEndDateKey(dateKey: string) {
  const [year, month, day] = getWeekStartDateKey(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().split("T")[0];
}

function getDateKeyDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split("T")[0];
}

function isTerminalGameStatus(status: string) {
  return status === "settled" || status === "cancelled";
}

function getScoreLookbackDays(games: { commence_time: string }[]) {
  const oldestCommenceAt = games.reduce((oldest, game) => {
    const gameTime = new Date(game.commence_time).getTime();
    return Math.min(oldest, gameTime);
  }, Date.now());

  const ageMs = Math.max(0, Date.now() - oldestCommenceAt);
  const days = Math.floor(ageMs / MS_PER_DAY) + 1;
  return Math.min(MAX_SCORE_LOOKBACK_DAYS, Math.max(1, days));
}

function hasGameStarted(commenceTime: string) {
  return new Date(commenceTime).getTime() <= Date.now();
}

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const candidateSlateIds = new Set<string>();
    const { data: unsettledGames } = await supabase
      .from("slate_games")
      .select("id, slate_id, sport_key, home_team, away_team, spread_home, spread_away, total_over, commence_time, status")
      .in("status", ["upcoming", "live"]);

    let settledCount = 0;

    if (unsettledGames?.length) {
      const scoreLookbackDays = getScoreLookbackDays(unsettledGames);
      const sportKeys = [...new Set(unsettledGames.map((g) => g.sport_key))];
      const scoresBySport: Record<string, ScoreEvent[]> = {};

      for (const sport of sportKeys) {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=${scoreLookbackDays}`;
        const resp = await fetch(url);
        if (!resp.ok) continue;
        scoresBySport[sport] = await resp.json();
      }

      for (const game of unsettledGames) {
        candidateSlateIds.add(game.slate_id);
        const gameStarted = hasGameStarted(game.commence_time);

        const scores = scoresBySport[game.sport_key] ?? [];
        const match = scores.find(
          (s) =>
            s.home_team === game.home_team &&
            s.away_team === game.away_team
        );

        if (!match || !match.scores) {
          if (gameStarted && game.status !== "live") {
            await supabase
              .from("slate_games")
              .update({ status: "live" })
              .eq("id", game.id);
          }
          continue;
        }

        if (!match.completed) {
          if (gameStarted && game.status !== "live") {
            await supabase
              .from("slate_games")
              .update({ status: "live" })
              .eq("id", game.id);
          }
          continue;
        }

        const homeScore = parseInt(match.scores.find((s) => s.name === game.home_team)?.score ?? "0");
        const awayScore = parseInt(match.scores.find((s) => s.name === game.away_team)?.score ?? "0");

        await supabase
          .from("slate_games")
          .update({ home_score: homeScore, away_score: awayScore, status: "settled" })
          .eq("id", game.id);

        const { data: bets } = await supabase
          .from("bets")
          .select("*")
          .eq("slate_game_id", game.id)
          .eq("result", "pending");

        for (const bet of bets ?? []) {
          const result = determineBetResult(bet, game, homeScore, awayScore);
          const payout = result === "won" ? calcPayout(bet.amount, bet.odds) : result === "push" ? bet.amount : 0;

          await supabase
            .from("bets")
            .update({ result, payout })
            .eq("id", bet.id);
        }

        settledCount++;
      }
    }

    const reconciliationWindowStart = getDateKeyDaysAgo(7);
    const { data: recentSlates } = await supabase
      .from("daily_slates")
      .select("id")
      .gte("date", reconciliationWindowStart);

    for (const slate of recentSlates ?? []) {
      candidateSlateIds.add(slate.id);
    }

    const reconciledSlates = await reconcileSlates(supabase, [...candidateSlateIds]);

    return jsonResp({
      message: `Settled ${settledCount} games and reconciled ${reconciledSlates} slates`,
    });
  } catch (err) {
    return jsonResp({ error: String(err) }, 500);
  }
});

async function reconcileSlates(supabase: SupabaseClient, slateIds: string[]) {
  let reconciledSlates = 0;

  for (const slateId of slateIds) {
    const { data: slate } = await supabase
      .from("daily_slates")
      .select("date, league_id, status")
      .eq("id", slateId)
      .maybeSingle();

    if (!slate) continue;

    const { data: slateGames } = await supabase
      .from("slate_games")
      .select("id, status, commence_time")
      .eq("slate_id", slateId);

    const games = slateGames ?? [];
    if (games.length === 0) continue;

    const allSettled = games.every((game) => isTerminalGameStatus(game.status));
    const anyStarted = games.some((game) => hasGameStarted(game.commence_time));
    const nextSlateStatus = allSettled ? "settled" : anyStarted ? "locked" : "open";

    if (slate.status !== nextSlateStatus) {
      await supabase
        .from("daily_slates")
        .update({ status: nextSlateStatus })
        .eq("id", slateId);
    }

    const gameIds = games.map((game) => game.id);

    const { data: allBets } = await supabase
      .from("bets")
      .select("*")
      .in("slate_game_id", gameIds);

    const resolvedBets = (allBets ?? []).filter((bet) => bet.result !== "pending");
    if (!allSettled && resolvedBets.length === 0) continue;

    const userBets: Record<string, typeof resolvedBets> = {};
    for (const bet of resolvedBets) {
      if (!userBets[bet.user_id]) userBets[bet.user_id] = [];
      userBets[bet.user_id]!.push(bet);
    }

    const { data: members } = await supabase
      .from("league_members")
      .select("user_id")
      .eq("league_id", slate.league_id);

    const memberIds = members?.map((member) => member.user_id) ?? [];
    const results: Array<{
      user_id: string;
      league_id: string;
      date: string;
      total_wagered: number;
      total_won: number;
      net_profit: number;
      wins: number;
      losses: number;
      pushes: number;
      placement: number;
      points: number;
    }> = [];

    for (const userId of memberIds) {
      const bets = userBets[userId] ?? [];
      const totalWagered = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
      const totalWon = bets.reduce((sum, bet) => sum + Number(bet.payout), 0);
      const wins = bets.filter((bet) => bet.result === "won").length;
      const losses = bets.filter((bet) => bet.result === "lost").length;
      const pushes = bets.filter((bet) => bet.result === "push").length;

      results.push({
        user_id: userId,
        league_id: slate.league_id,
        date: slate.date,
        total_wagered: totalWagered,
        total_won: totalWon,
        net_profit: totalWon - totalWagered,
        wins,
        losses,
        pushes,
        placement: 0,
        points: 0,
      });
    }

    results.sort((a, b) => b.net_profit - a.net_profit);
    results.forEach((result, index) => {
      result.placement = index + 1;
      result.points = getPoints(index + 1);
    });

    for (const result of results) {
      const { error } = await supabase.from("daily_results").upsert(result, {
        onConflict: "user_id,league_id,date",
      });
      if (error) throw error;
    }

    const monday = getWeekStartDateKey(slate.date);
    const sunday = getWeekEndDateKey(slate.date);

    const { data: weekDays } = await supabase
      .from("daily_results")
      .select("*")
      .eq("league_id", slate.league_id)
      .gte("date", monday)
      .lte("date", sunday);

    const weeklyByUser: Record<string, { points: number; profit: number; wins: number; losses: number }> = {};

    for (const dailyResult of weekDays ?? []) {
      if (!weeklyByUser[dailyResult.user_id]) {
        weeklyByUser[dailyResult.user_id] = { points: 0, profit: 0, wins: 0, losses: 0 };
      }
      weeklyByUser[dailyResult.user_id].points += dailyResult.points;
      weeklyByUser[dailyResult.user_id].profit += Number(dailyResult.net_profit);
      weeklyByUser[dailyResult.user_id].wins += dailyResult.wins;
      weeklyByUser[dailyResult.user_id].losses += dailyResult.losses;
    }

    const weeklyResults = Object.entries(weeklyByUser)
      .map(([userId, stats]) => ({
        user_id: userId,
        league_id: slate.league_id,
        week_start: monday,
        week_end: sunday,
        total_points: stats.points,
        total_profit: stats.profit,
        total_wins: stats.wins,
        total_losses: stats.losses,
        placement: 0,
      }))
      .sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.total_profit - a.total_profit;
      });

    weeklyResults.forEach((result, index) => {
      result.placement = index + 1;
    });

    for (const weeklyResult of weeklyResults) {
      const { error } = await supabase.from("weekly_results").upsert(weeklyResult, {
        onConflict: "user_id,league_id,week_start",
      });
      if (error) throw error;
    }

    reconciledSlates++;
  }

  return reconciledSlates;
}

function determineBetResult(
  bet: { bet_type: string; bet_pick: string },
  game: { spread_home: number | null; spread_away: number | null; total_over: number | null },
  homeScore: number,
  awayScore: number
): "won" | "lost" | "push" {
  const scoreDiff = homeScore - awayScore;
  const totalScore = homeScore + awayScore;

  switch (bet.bet_type) {
    case "moneyline": {
      if (bet.bet_pick === "home") return homeScore > awayScore ? "won" : homeScore < awayScore ? "lost" : "push";
      return awayScore > homeScore ? "won" : awayScore < homeScore ? "lost" : "push";
    }
    case "spread": {
      const spread = bet.bet_pick === "home" ? game.spread_home ?? 0 : game.spread_away ?? 0;
      const adjustedDiff = bet.bet_pick === "home" ? scoreDiff + spread : -scoreDiff + spread;
      if (adjustedDiff > 0) return "won";
      if (adjustedDiff < 0) return "lost";
      return "push";
    }
    case "over_under": {
      const line = game.total_over ?? 0;
      if (bet.bet_pick === "over") return totalScore > line ? "won" : totalScore < line ? "lost" : "push";
      return totalScore < line ? "won" : totalScore > line ? "lost" : "push";
    }
    default:
      return "lost";
  }
}

function jsonResp(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

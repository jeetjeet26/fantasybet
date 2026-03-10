// Supabase Edge Function: settle-bets
// Runs periodically to check completed games and settle bets
// Deploy with: supabase functions deploy settle-bets

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: unsettledGames } = await supabase
      .from("slate_games")
      .select("*, daily_slates!inner(date)")
      .eq("status", "upcoming");

    if (!unsettledGames || unsettledGames.length === 0) {
      return jsonResp({ message: "No unsettled games" });
    }

    const sportKeys = [...new Set(unsettledGames.map((g) => g.sport_key))];
    const scoresBySport: Record<string, ScoreEvent[]> = {};

    for (const sport of sportKeys) {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=1`;
      const resp = await fetch(url);
      if (!resp.ok) continue;
      scoresBySport[sport] = await resp.json();
    }

    let settledCount = 0;

    for (const game of unsettledGames) {
      const scores = scoresBySport[game.sport_key] ?? [];
      const match = scores.find(
        (s) =>
          s.home_team === game.home_team &&
          s.away_team === game.away_team &&
          s.completed
      );

      if (!match || !match.scores) continue;

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

    // Check if all games for any slate are settled → calculate daily results
    const slateIds = [...new Set(unsettledGames.map((g) => g.slate_id))];

    for (const slateId of slateIds) {
      const { data: slateGames } = await supabase
        .from("slate_games")
        .select("status")
        .eq("slate_id", slateId);

      const allSettled = slateGames?.every((g) => g.status === "settled" || g.status === "cancelled");
      if (!allSettled) continue;

      await supabase
        .from("daily_slates")
        .update({ status: "settled" })
        .eq("id", slateId);

      const { data: slate } = await supabase
        .from("daily_slates")
        .select("date, league_id")
        .eq("id", slateId)
        .single();

      if (!slate) continue;

      const leagueId = slate.league_id;

      // Get all bets for this slate
      const { data: allSlateGames } = await supabase
        .from("slate_games")
        .select("id")
        .eq("slate_id", slateId);

      const gameIds = allSlateGames?.map((g) => g.id) ?? [];

      const { data: allBets } = await supabase
        .from("bets")
        .select("*")
        .in("slate_game_id", gameIds);

      // Group bets by user
      const userBets: Record<string, typeof allBets> = {};
      for (const bet of allBets ?? []) {
        if (!userBets[bet.user_id]) userBets[bet.user_id] = [];
        userBets[bet.user_id]!.push(bet);
      }

      const { data: members } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", leagueId);

      const memberIds = members?.map((m) => m.user_id) ?? [];
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
        const totalWagered = bets.reduce((s, b) => s + Number(b.amount), 0);
        const totalWon = bets.reduce((s, b) => s + Number(b.payout), 0);
        const wins = bets.filter((b) => b.result === "won").length;
        const losses = bets.filter((b) => b.result === "lost").length;
        const pushes = bets.filter((b) => b.result === "push").length;

        results.push({
          user_id: userId,
          league_id: leagueId,
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
      results.forEach((r, i) => {
        r.placement = i + 1;
        r.points = getPoints(i + 1);
      });

      for (const r of results) {
        await supabase.from("daily_results").upsert(r, {
          onConflict: "user_id,league_id,date",
        });
      }

      // Update weekly results for this league
      const monday = getWeekStartDateKey(slate.date);

      const { data: weekDays } = await supabase
        .from("daily_results")
        .select("*")
        .eq("league_id", leagueId)
        .gte("date", monday)
        .lte("date", slate.date);

      const weeklyByUser: Record<string, { points: number; profit: number; wins: number; losses: number }> = {};

      for (const dr of weekDays ?? []) {
        if (!weeklyByUser[dr.user_id]) {
          weeklyByUser[dr.user_id] = { points: 0, profit: 0, wins: 0, losses: 0 };
        }
        weeklyByUser[dr.user_id].points += dr.points;
        weeklyByUser[dr.user_id].profit += Number(dr.net_profit);
        weeklyByUser[dr.user_id].wins += dr.wins;
        weeklyByUser[dr.user_id].losses += dr.losses;
      }

      const weeklyResults = Object.entries(weeklyByUser)
        .map(([userId, stats]) => ({
          user_id: userId,
          league_id: leagueId,
          week_start: monday,
          ...stats,
          total_points: stats.points,
          total_profit: stats.profit,
          total_wins: stats.wins,
          total_losses: stats.losses,
          placement: 0,
        }))
        .sort((a, b) => b.total_points - a.total_points);

      weeklyResults.forEach((r, i) => {
        r.placement = i + 1;
      });

      for (const wr of weeklyResults) {
        await supabase.from("weekly_results").upsert(wr, {
          onConflict: "user_id,league_id,week_start",
        });
      }
    }

    return jsonResp({ message: `Settled ${settledCount} games` });
  } catch (err) {
    return jsonResp({ error: String(err) }, 500);
  }
});

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

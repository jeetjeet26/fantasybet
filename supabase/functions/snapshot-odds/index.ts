// Supabase Edge Function: snapshot-odds
// Runs daily via cron to pull 5 game lines from The Odds API and create a slate per league
// Deploy with: supabase functions deploy snapshot-odds

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ODDS_API_KEY = Deno.env.get("THE_ODDS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const US_SPORTS = [
  "americanfootball_nfl",
  "basketball_nba",
  "baseball_mlb",
  "icehockey_nhl",
  "americanfootball_ncaaf",
  "basketball_ncaab",
];

const SPORT_PRIORITY: Record<string, number> = {
  americanfootball_nfl: 1,
  basketball_nba: 2,
  baseball_mlb: 3,
  icehockey_nhl: 4,
  americanfootball_ncaaf: 5,
  basketball_ncaab: 6,
};

interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Bookmaker[];
}

interface Bookmaker {
  key: string;
  markets: Market[];
}

interface Market {
  key: string;
  outcomes: Outcome[];
}

interface Outcome {
  name: string;
  price: number;
  point?: number;
}

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date().toISOString().split("T")[0];

    const { data: leagues } = await supabase
      .from("leagues")
      .select("id");

    if (!leagues || leagues.length === 0) {
      return new Response(JSON.stringify({ message: "No leagues" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allEvents: OddsEvent[] = [];

    for (const sport of US_SPORTS) {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=spreads,h2h,totals&oddsFormat=american`;

      const resp = await fetch(url);
      if (!resp.ok) continue;

      const events: OddsEvent[] = await resp.json();
      const todayEvents = events.filter((e) => {
        const eventDate = new Date(e.commence_time).toISOString().split("T")[0];
        return eventDate === today;
      });
      allEvents.push(...todayEvents);
    }

    allEvents.sort((a, b) => {
      const pa = SPORT_PRIORITY[a.sport_key] ?? 99;
      const pb = SPORT_PRIORITY[b.sport_key] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
    });

    const selected = allEvents.slice(0, 5);

    if (selected.length === 0) {
      return new Response(JSON.stringify({ message: "No games found for today" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let created = 0;

    for (const league of leagues) {
      const { data: existing } = await supabase
        .from("daily_slates")
        .select("id")
        .eq("league_id", league.id)
        .eq("date", today)
        .single();

      if (existing) continue;

      const { data: slate, error: slateError } = await supabase
        .from("daily_slates")
        .insert({
          league_id: league.id,
          date: today,
          locked_at: new Date().toISOString(),
          status: "open",
        })
        .select()
        .single();

      if (slateError) throw slateError;

      const games = selected.map((event) => {
        const book = event.bookmakers[0];
        const spreads = book?.markets.find((m) => m.key === "spreads");
        const h2h = book?.markets.find((m) => m.key === "h2h");
        const totals = book?.markets.find((m) => m.key === "totals");

        const homeSpread = spreads?.outcomes.find((o) => o.name === event.home_team);
        const awaySpread = spreads?.outcomes.find((o) => o.name === event.away_team);
        const homeML = h2h?.outcomes.find((o) => o.name === event.home_team);
        const awayML = h2h?.outcomes.find((o) => o.name === event.away_team);
        const over = totals?.outcomes.find((o) => o.name === "Over");
        const under = totals?.outcomes.find((o) => o.name === "Under");

        return {
          slate_id: slate.id,
          sport_key: event.sport_key,
          sport_title: event.sport_title,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          spread_home: homeSpread?.point ?? null,
          spread_away: awaySpread?.point ?? null,
          spread_home_odds: homeSpread?.price ?? null,
          spread_away_odds: awaySpread?.price ?? null,
          moneyline_home: homeML?.price ?? null,
          moneyline_away: awayML?.price ?? null,
          total_over: over?.point ?? null,
          total_under: under?.point ?? null,
          total_over_odds: over?.price ?? null,
          total_under_odds: under?.price ?? null,
          status: "upcoming",
        };
      });

      const { error: gamesError } = await supabase.from("slate_games").insert(games);
      if (gamesError) throw gamesError;

      const { data: members } = await supabase
        .from("league_members")
        .select("user_id")
        .eq("league_id", league.id);
      if (members && members.length > 0) {
        const { data: leagueRow } = await supabase.from("leagues").select("name").eq("id", league.id).single();
        const leagueName = leagueRow?.name ?? "Your league";
        await supabase.from("notifications").insert(
          members.map((m) => ({
            user_id: m.user_id,
            type: "slate_ready",
            title: `New slate: ${leagueName}`,
            link: `/leagues/${league.id}`,
          }))
        );
      }
      created++;
    }

    return new Response(
      JSON.stringify({ message: `Created ${created} slates with ${selected.length} games each` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

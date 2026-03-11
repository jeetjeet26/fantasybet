// Supabase Edge Function: snapshot-odds
// Runs daily via cron to pull 5 game lines from The Odds API and create a slate per league
// Deploy with: supabase functions deploy snapshot-odds

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface SelectedGame {
  odds_api_event_id: string | null;
  sport_key: string;
  sport_title: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  spread_home: number | null;
  spread_away: number | null;
  spread_home_odds: number | null;
  spread_away_odds: number | null;
  moneyline_home: number | null;
  moneyline_away: number | null;
  total_over: number | null;
  total_under: number | null;
  total_over_odds: number | null;
  total_under_odds: number | null;
}

const EASTERN_TIME_ZONE = "America/New_York";
const SLATE_RELEASE_HOUR_ET = 6;

function getEasternDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) throw new Error("Failed to resolve Eastern date");
  return `${year}-${month}-${day}`;
}

function getEasternHour(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  });

  return Number(formatter.format(date));
}

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: oddsApiKey, error: oddsApiKeyError } = await supabase
      .rpc("get_the_odds_api_key");

    if (oddsApiKeyError || !oddsApiKey) {
      return new Response(JSON.stringify({ error: "Missing Odds API key secret" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    const easternNow = new Date();
    const today = getEasternDateKey(easternNow);
    const easternHour = getEasternHour(easternNow);
    const nowIso = new Date().toISOString();
    const next36HoursIso = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString();

    if (easternHour < SLATE_RELEASE_HOUR_ET) {
      return new Response(JSON.stringify({ message: "Waiting until 6:00 AM Eastern to publish today's slate" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: leagues } = await supabase
      .from("leagues")
      .select("id");

    if (!leagues || leagues.length === 0) {
      return new Response(JSON.stringify({ message: "No leagues" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { count: existingSlateCount } = await supabase
      .from("daily_slates")
      .select("id", { count: "exact", head: true })
      .eq("date", today);

    if (existingSlateCount != null && existingSlateCount >= leagues.length) {
      return new Response(JSON.stringify({ message: "Today's slates already exist" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allEvents: OddsEvent[] = [];

    for (const sport of US_SPORTS) {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&regions=us&markets=spreads,h2h,totals&oddsFormat=american`;

      const resp = await fetch(url);
      if (!resp.ok) continue;

      const events: OddsEvent[] = await resp.json();
      allEvents.push(...events);
    }

    allEvents.sort((a, b) => {
      const pa = SPORT_PRIORITY[a.sport_key] ?? 99;
      const pb = SPORT_PRIORITY[b.sport_key] ?? 99;
      if (pa !== pb) return pa - pb;
      return new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime();
    });

    const candidateEvents = allEvents.filter((e) => {
      const commenceIso = new Date(e.commence_time).toISOString();
      return commenceIso > nowIso && commenceIso <= next36HoursIso;
    });

    const upcomingEvents = candidateEvents.length > 0
      ? candidateEvents
      : allEvents.filter((e) => new Date(e.commence_time).toISOString() > nowIso);

    let selectedGames: SelectedGame[] = upcomingEvents
      .slice(0, 5)
      .map((event) => {
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
          odds_api_event_id: event.id,
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
        };
      });

    // Fallback: if API has no open games at call time, clone any still-open games from existing
    // same-day slates so late-created leagues can still participate.
    if (selectedGames.length === 0) {
      const { data: upcomingSlates } = await supabase
        .from("daily_slates")
        .select("id")
        .gte("date", today);

      const slateIds = (upcomingSlates ?? []).map((s) => s.id);
      if (slateIds.length > 0) {
        const { data: openTemplateGames } = await supabase
          .from("slate_games")
          .select("odds_api_event_id, sport_key, sport_title, home_team, away_team, commence_time, spread_home, spread_away, spread_home_odds, spread_away_odds, moneyline_home, moneyline_away, total_over, total_under, total_over_odds, total_under_odds, status")
          .in("slate_id", slateIds)
          .eq("status", "upcoming")
          .gt("commence_time", nowIso)
          .order("commence_time", { ascending: true });

        const deduped = new Map<string, SelectedGame>();
        for (const g of openTemplateGames ?? []) {
          const key = `${g.sport_key}:${g.home_team}:${g.away_team}:${g.commence_time}`;
          if (deduped.has(key)) continue;
          deduped.set(key, {
            odds_api_event_id: g.odds_api_event_id,
            sport_key: g.sport_key,
            sport_title: g.sport_title,
            home_team: g.home_team,
            away_team: g.away_team,
            commence_time: g.commence_time,
            spread_home: g.spread_home,
            spread_away: g.spread_away,
            spread_home_odds: g.spread_home_odds,
            spread_away_odds: g.spread_away_odds,
            moneyline_home: g.moneyline_home,
            moneyline_away: g.moneyline_away,
            total_over: g.total_over,
            total_under: g.total_under,
            total_over_odds: g.total_over_odds,
            total_under_odds: g.total_under_odds,
          });
          if (deduped.size === 5) break;
        }
        selectedGames = Array.from(deduped.values());
      }
    }

    if (selectedGames.length === 0) {
      return new Response(JSON.stringify({ message: "No open games available for today" }), {
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
        .maybeSingle();

      if (existing) continue;

      const { data: slate, error: slateError } = await supabase
        .from("daily_slates")
        .insert({
          league_id: league.id,
          date: today,
          locked_at: selectedGames[0]?.commence_time ?? new Date().toISOString(),
          status: "open",
        })
        .select()
        .single();

      if (slateError) throw slateError;

      const games = selectedGames.map((event) => {
        return {
          slate_id: slate.id,
          odds_api_event_id: event.odds_api_event_id,
          sport_key: event.sport_key,
          sport_title: event.sport_title,
          home_team: event.home_team,
          away_team: event.away_team,
          commence_time: event.commence_time,
          spread_home: event.spread_home,
          spread_away: event.spread_away,
          spread_home_odds: event.spread_home_odds,
          spread_away_odds: event.spread_away_odds,
          moneyline_home: event.moneyline_home,
          moneyline_away: event.moneyline_away,
          total_over: event.total_over,
          total_under: event.total_under,
          total_over_odds: event.total_over_odds,
          total_under_odds: event.total_under_odds,
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
      JSON.stringify({ message: `Created ${created} slates with ${selectedGames.length} open games each` }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

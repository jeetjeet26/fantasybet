import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DAILY_CREDITS } from "@/lib/odds";
import { getEasternDateKey } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_code)")
    .eq("user_id", user!.id);

  const leagues = (memberships ?? [])
    .map((m) => m.leagues)
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const today = getEasternDateKey();

  const overview = await Promise.all(
    leagues.map(async (league) => {
      const { data: slate } = await supabase
        .from("daily_slates")
        .select("id, status")
        .eq("league_id", league.id)
        .eq("date", today)
        .maybeSingle();

      let creditsRemaining = DAILY_CREDITS;
      let dailyPlacement: number | null = null;

      if (slate) {
        const { data: games } = await supabase
          .from("slate_games")
          .select("id")
          .eq("slate_id", slate.id);
        const gameIds = (games ?? []).map((g) => g.id);

        const { data: myBets } = await supabase
          .from("bets")
          .select("amount, slate_game_id")
          .eq("user_id", user!.id);
        const wagered = (myBets ?? [])
          .filter((b) => gameIds.includes(b.slate_game_id))
          .reduce((sum, b) => sum + Number(b.amount), 0);
        creditsRemaining = DAILY_CREDITS - wagered;
      }

      const { data: myResult } = await supabase
        .from("daily_results")
        .select("placement, net_profit")
        .eq("league_id", league.id)
        .eq("user_id", user!.id)
        .eq("date", today)
        .maybeSingle();

      if (myResult) {
        dailyPlacement = myResult.placement;
      }

      return {
        league,
        slate: slate ?? null,
        creditsRemaining,
        dailyPlacement,
        netProfit: myResult?.net_profit ?? null,
      };
    })
  );

  const activeSlates = overview.filter(({ slate }) => slate?.status === "open").length;
  const totalCreditsRemaining = overview.reduce((sum, item) => sum + item.creditsRemaining, 0);
  const bestStanding = overview
    .filter((item) => item.dailyPlacement != null)
    .reduce<number | null>((best, item) => {
      if (item.dailyPlacement == null) return best;
      if (best == null) return item.dailyPlacement;
      return Math.min(best, item.dailyPlacement);
    }, null);

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-primary/12 via-background to-background ring-1 ring-primary/15">
        <CardContent className="flex flex-col gap-6 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="border-primary/20 bg-background/70">
              Today&apos;s game
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Make today&apos;s picks fast.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                Jump into your leagues, use your daily credits, and see where you stand before the slate locks.
              </p>
            </div>
          </div>

          {overview.length > 0 ? (
            <div className="grid w-full gap-3 sm:w-auto sm:min-w-[22rem] sm:grid-cols-2">
              <TodayStat label="Open leagues" value={`${activeSlates}/${overview.length}`} />
              <TodayStat label="Credits left" value={`${totalCreditsRemaining}`} helper={`of ${overview.length * DAILY_CREDITS}`} />
              <TodayStat label="Best standing" value={bestStanding != null ? `#${bestStanding}` : "—"} />
              <TodayStat label="Daily bankroll" value={`${DAILY_CREDITS}`} helper="per league" />
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/leagues/join/enter">
                <Button variant="outline">Join League</Button>
              </Link>
              <Link href="/leagues/create">
                <Button>Create League</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {overview.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle>Ready to play</CardTitle>
              <p className="text-sm text-muted-foreground">
                Open a league, place picks, and track how today is shaping up.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <QuickStatCard
                title="Active slates"
                value={`${activeSlates}`}
                description={activeSlates === 1 ? "1 league is open right now" : `${activeSlates} leagues are open right now`}
              />
              <QuickStatCard
                title="Credits left"
                value={`${totalCreditsRemaining}`}
                description="Across all of your leagues today"
              />
              <QuickStatCard
                title="Best finish"
                value={bestStanding != null ? `#${bestStanding}` : "—"}
                description="Your current top standing today"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Daily rhythm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>1. Open a league and scan the slate.</p>
              <Separator />
              <p>2. Spend your credits across the lines you like.</p>
              <Separator />
              <p>3. Check back here to see where you land.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {overview.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">You&apos;re not in a league yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a league for your group or join one with an invite code to unlock today&apos;s slate.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/leagues/join/enter">
                <Button variant="outline">Join League</Button>
              </Link>
              <Link href="/leagues/create">
                <Button>Create League</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.map(({ league, slate, creditsRemaining, dailyPlacement, netProfit }) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:bg-accent/30 hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{league.name}</CardTitle>
                      <Badge variant="secondary" className="w-fit font-mono text-xs">
                        {league.invite_code}
                      </Badge>
                    </div>
                    <Badge
                      variant={slate?.status === "open" ? "default" : "outline"}
                      className={slate?.status === "open" ? "bg-primary/90" : ""}
                    >
                      {slate ? (slate.status === "open" ? "Open now" : slate.status) : "No slate"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {slate ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <LeagueMetric
                          label="Credits left"
                          value={`${creditsRemaining}`}
                          helper={`of ${DAILY_CREDITS}`}
                        />
                        <LeagueMetric
                          label="Today"
                          value={dailyPlacement != null ? `#${dailyPlacement}` : "—"}
                          helper={netProfit != null ? `${netProfit >= 0 ? "+" : ""}${Number(netProfit).toFixed(2)}` : "No result yet"}
                          helperClassName={netProfit == null ? undefined : netProfit >= 0 ? "text-green-500" : "text-red-500"}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {slate.status === "open"
                          ? "Today’s slate is live. Open this league to place picks."
                          : "Today’s slate has settled. Open this league to review results."}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No slate has been posted here yet. Check back tomorrow for the next set of games.
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TodayStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-3 shadow-sm backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

function QuickStatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function LeagueMetric({
  label,
  value,
  helper,
  helperClassName,
}: {
  label: string;
  value: string;
  helper: string;
  helperClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tracking-tight">{value}</p>
      <p className={`text-xs text-muted-foreground ${helperClassName ?? ""}`}>{helper}</p>
    </div>
  );
}

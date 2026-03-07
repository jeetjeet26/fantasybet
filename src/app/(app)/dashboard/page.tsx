import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DAILY_CREDITS } from "@/lib/odds";
import { Button } from "@/components/ui/button";
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

  const today = new Date().toISOString().split("T")[0];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Your leagues at a glance. Open a league to see today&apos;s games and place bets.
        </p>
      </div>

      {overview.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You&apos;re not in any leagues yet.
            </p>
            <Link href="/leagues">
              <Button className="mt-4">Browse Leagues</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.map(({ league, slate, creditsRemaining, dailyPlacement, netProfit }) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="transition-colors hover:bg-accent/50 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{league.name}</CardTitle>
                  <Badge variant="secondary" className="font-mono text-xs w-fit">
                    {league.invite_code}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {slate ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credits left</span>
                        <span className="font-mono">{creditsRemaining} / {DAILY_CREDITS}</span>
                      </div>
                      {dailyPlacement != null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Today</span>
                          <span>
                            #{dailyPlacement}
                            {netProfit != null && (
                              <span className={netProfit >= 0 ? "text-green-500" : "text-red-500"}>
                                {" "}({netProfit >= 0 ? "+" : ""}{Number(netProfit).toFixed(2)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      <p className="text-muted-foreground text-xs">
                        {slate.status === "open" ? "Betting open" : slate.status}
                      </p>
                    </>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      No games today. Check back tomorrow.
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

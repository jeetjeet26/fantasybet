import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { LeaderboardTable } from "@/components/leagues/leaderboard-table";
import { MembersList } from "@/components/leagues/members-list";
import { InviteSection } from "@/components/leagues/invite-section";
import { CommissionerSection } from "@/components/leagues/commissioner-section";
import { LeagueBetting } from "@/components/betting/league-betting";
import { DailyBetSlip } from "@/components/betting/daily-bet-slip";
import { rankDailyResults, rankWeeklyResults } from "@/lib/leaderboards";
import { DAILY_CREDITS } from "@/lib/odds";
import { syncBetSettlement } from "@/lib/settlement";
import { formatDateKey, getCurrentEasternWeekEnd, getCurrentEasternWeekStart, getEasternDateKey } from "@/lib/time";
import type { SlateGame, Bet } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  await syncBetSettlement();

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id, name, invite_code, invite_slug, description, max_members, invite_mode, logo_url, created_by, created_at")
    .eq("id", id)
    .single();

  if (error || !league) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id, joined_at, role, profiles(id, display_name, avatar_url)")
    .eq("league_id", id);

  const myMembership = (members ?? []).find((m) => m.user_id === user?.id);
  const isCommissioner = myMembership?.role === "commissioner";

  const { data: pendingInvites } = await supabase
    .from("league_invites")
    .select("id, invited_email, created_at")
    .eq("league_id", id)
    .eq("status", "pending");

  const today = getEasternDateKey();

  const { data: slate } = await supabase
    .from("daily_slates")
    .select("*")
    .eq("league_id", id)
    .eq("date", today)
    .maybeSingle();

  let games: SlateGame[] = [];
  let myBets: Bet[] = [];
  let creditsRemaining = DAILY_CREDITS;

  if (slate) {
    const { data: gamesData } = await supabase
      .from("slate_games")
      .select("*")
      .eq("slate_id", slate.id)
      .order("commence_time", { ascending: true });
    games = gamesData ?? [];

    if (user) {
      const { data: betsData } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", user.id);
      const gameIds = games.map((g) => g.id);
      myBets = (betsData ?? []).filter((b) => gameIds.includes(b.slate_game_id));
      const totalWagered = myBets.reduce((sum, b) => sum + Number(b.amount), 0);
      creditsRemaining = DAILY_CREDITS - totalWagered;
    }
  }

  const { data: dailyResults } = await supabase
    .from("daily_results")
    .select("*, profiles(display_name)")
    .eq("league_id", id)
    .eq("date", today);

  const monday = getCurrentEasternWeekStart();
  const sunday = getCurrentEasternWeekEnd();
  const { data: weeklyDailyResults } = await supabase
    .from("daily_results")
    .select("*, profiles(display_name)")
    .eq("league_id", id)
    .gte("date", monday)
    .lte("date", sunday);

  const weeklyRangeLabel = `${formatDateKey(monday)} - ${formatDateKey(sunday, { month: "short", day: "numeric", year: "numeric" })}`;

  const rankedDailyResults = rankDailyResults((dailyResults ?? []) as Parameters<typeof rankDailyResults>[0]);
  const rankedWeeklyResults = rankWeeklyResults((weeklyDailyResults ?? []) as Parameters<typeof rankWeeklyResults>[0]);
  const myDailyResult = rankedDailyResults.find((result) => result.user_id === user?.id);
  const membersCount = members?.length ?? 0;

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-background ring-1 ring-primary/15">
        <CardContent className="space-y-5 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-semibold tracking-tight">{league.name}</h1>
                {isCommissioner && (
                  <Badge variant="default" className="text-xs">Commissioner</Badge>
                )}
                <Badge variant={slate?.status === "open" ? "default" : "outline"}>
                  {slate?.status === "open" ? "Slate live" : slate?.status ?? "Waiting for slate"}
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                {league.description?.trim()
                  ? league.description
                  : "Today’s board is built for quick picks, friend competition, and a clean daily rhythm."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="font-mono">
                {league.invite_code}
              </Badge>
              {league.invite_slug != null && (
                <Badge variant="outline" className="font-mono text-xs">
                  /join/{league.invite_slug}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LeagueHeaderMetric
              label="Members"
              value={`${membersCount}`}
              helper={membersCount === 1 ? "1 player in this league" : `${membersCount} players in this league`}
            />
            <LeagueHeaderMetric
              label="Credits left"
              value={`${creditsRemaining}`}
              helper={`out of ${DAILY_CREDITS} today`}
            />
            <LeagueHeaderMetric
              label="Today"
              value={myDailyResult ? `#${myDailyResult.placement}` : "—"}
              helper={
                myDailyResult
                  ? `${myDailyResult.bankedCredits.toFixed(2)} banked`
                  : "No settled bets yet"
              }
              helperClassName={
                myDailyResult
                  ? myDailyResult.bankedCredits >= DAILY_CREDITS
                    ? "text-green-500"
                    : "text-red-500"
                  : undefined
              }
            />
          </div>
        </CardContent>
      </Card>

      <DailyBetSlip leagueId={id} hideWhenEmpty />

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today&apos;s Games</TabsTrigger>
          <TabsTrigger value="daily">Daily Leaderboard</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Leaderboard</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isCommissioner && <TabsTrigger value="commissioner">Commissioner</TabsTrigger>}
        </TabsList>

        <TabsContent value="today" className="mt-4">
          <LeagueBetting
            leagueId={id}
            slate={slate}
            games={games}
            myBets={myBets}
            creditsRemaining={creditsRemaining}
          />
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Leaderboard</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ranked by credits banked from settled bets after unused credits expire.
              </p>
            </CardHeader>
            <CardContent>
              {rankedDailyResults.length > 0 ? (
                <LeaderboardTable results={rankedDailyResults} type="daily" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No settled bets yet for this slate. Standings update as games finish.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Leaderboard: {weeklyRangeLabel}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Ranked by total banked credits from this Monday-Sunday window.
              </p>
            </CardHeader>
            <CardContent>
              {rankedWeeklyResults.length > 0 ? (
                <LeaderboardTable results={rankedWeeklyResults} type="weekly" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No weekly results posted for this Monday-Sunday window yet. Keep competing!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
            </CardHeader>
            <CardContent>
              <MembersList
                leagueId={id}
                members={(members ?? []) as unknown as Parameters<typeof MembersList>[0]["members"]}
                isCommissioner={isCommissioner}
              />
            </CardContent>
          </Card>
          <Separator />
          <InviteSection
            leagueId={id}
            inviteCode={league.invite_code}
            inviteSlug={league.invite_slug ?? league.invite_code}
            pendingInvites={(pendingInvites ?? []) as { id: string; invited_email: string; created_at: string }[]}
            isCommissioner={isCommissioner}
          />
        </TabsContent>

        {isCommissioner && (
          <TabsContent value="commissioner" className="mt-4">
            <CommissionerSection leagueId={id} league={league} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function LeagueHeaderMetric({
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
    <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className={`text-xs text-muted-foreground ${helperClassName ?? ""}`}>{helper}</p>
    </div>
  );
}

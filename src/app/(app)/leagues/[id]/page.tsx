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
import { DAILY_CREDITS } from "@/lib/odds";
import type { SlateGame, Bet } from "@/lib/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LeagueDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

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

  const today = new Date().toISOString().split("T")[0];

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
    .eq("date", today)
    .order("placement", { ascending: true });

  const monday = getMonday(new Date()).toISOString().split("T")[0];
  const { data: weeklyResults } = await supabase
    .from("weekly_results")
    .select("*, profiles(display_name)")
    .eq("league_id", id)
    .eq("week_start", monday)
    .order("placement", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{league.name}</h1>
          {isCommissioner && (
            <Badge variant="default" className="text-xs">Commissioner</Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Invite code:</span>
          <Badge variant="secondary" className="font-mono">
            {league.invite_code}
          </Badge>
          {league.invite_slug != null && (
            <>
              <span className="text-sm text-muted-foreground">Invite link:</span>
              <Badge variant="outline" className="font-mono text-xs">
                /join/{league.invite_slug}
              </Badge>
            </>
          )}
        </div>
      </div>

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
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Daily Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                {dailyResults && dailyResults.length > 0 ? (
                  <LeaderboardTable results={dailyResults as unknown as Parameters<typeof LeaderboardTable>[0]["results"]} type="daily" />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No results yet for today. Place your bets!
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="lg:sticky lg:top-20 lg:self-start">
              <DailyBetSlip leagueId={id} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyResults && weeklyResults.length > 0 ? (
                <LeaderboardTable results={weeklyResults as unknown as Parameters<typeof LeaderboardTable>[0]["results"]} type="weekly" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No weekly results yet. Keep competing!
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

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

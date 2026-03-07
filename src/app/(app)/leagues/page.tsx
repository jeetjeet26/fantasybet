import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function LeaguesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id, leagues(id, name, invite_code, created_by)")
    .eq("user_id", user!.id);

  const leagues = (memberships ?? [])
    .map((m) => m.leagues)
    .filter((l): l is NonNullable<typeof l> => l !== null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your Leagues</h1>
        <div className="flex gap-2">
          <Link href="/leagues/join/enter">
            <Button variant="outline" size="sm">Join League</Button>
          </Link>
          <Link href="/leagues/create">
            <Button size="sm">Create League</Button>
          </Link>
        </div>
      </div>

      {leagues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You&apos;re not in any leagues yet. Create one or join with an invite code.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {leagues.map((league) => (
            <Link key={league.id} href={`/leagues/${league.id}`}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{league.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {league.invite_code}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

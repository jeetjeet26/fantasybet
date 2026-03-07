import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatOdds } from "@/lib/odds";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: bets } = await supabase
    .from("bets")
    .select("*, slate_games(home_team, away_team, sport_key, commence_time, home_score, away_score, status)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const allBets = bets ?? [];
  const settled = allBets.filter((b) => b.result !== "pending");
  const pending = allBets.filter((b) => b.result === "pending");

  const totalProfit = settled.reduce((sum, b) => sum + Number(b.payout) - Number(b.amount), 0);
  const totalWins = settled.filter((b) => b.result === "won").length;
  const totalLosses = settled.filter((b) => b.result === "lost").length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Bet History</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Bets" value={String(allBets.length)} />
        <StatCard label="Record" value={`${totalWins}-${totalLosses}`} />
        <StatCard
          label="Net Profit"
          value={`${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`}
          className={totalProfit >= 0 ? "text-green-500" : "text-red-500"}
        />
        <StatCard label="Pending" value={String(pending.length)} />
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Bets</CardTitle>
          </CardHeader>
          <CardContent>
            <BetTable bets={pending} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settled Bets</CardTitle>
        </CardHeader>
        <CardContent>
          {settled.length > 0 ? (
            <BetTable bets={settled} />
          ) : (
            <p className="text-sm text-muted-foreground">No settled bets yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold font-mono ${className ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

interface BetWithGame {
  id: string;
  bet_type: string;
  bet_pick: string;
  amount: number;
  odds: number;
  potential_payout: number;
  payout: number;
  result: string;
  created_at: string;
  slate_games: {
    home_team: string;
    away_team: string;
    sport_key: string;
    commence_time: string;
    home_score: number | null;
    away_score: number | null;
    status: string;
  } | null;
}

function BetTable({ bets }: { bets: BetWithGame[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Game</TableHead>
          <TableHead>Bet</TableHead>
          <TableHead className="text-right">Wager</TableHead>
          <TableHead className="text-right">Odds</TableHead>
          <TableHead className="text-right">Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bets.map((bet) => (
          <TableRow key={bet.id}>
            <TableCell className="text-sm">
              {bet.slate_games
                ? `${bet.slate_games.away_team} @ ${bet.slate_games.home_team}`
                : "Unknown"}
            </TableCell>
            <TableCell>
              <span className="text-sm">
                {bet.bet_type === "over_under"
                  ? bet.bet_pick === "over"
                    ? "Over"
                    : "Under"
                  : bet.bet_pick === "home"
                    ? bet.slate_games?.home_team
                    : bet.slate_games?.away_team}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({bet.bet_type === "over_under" ? "Total" : bet.bet_type})
              </span>
            </TableCell>
            <TableCell className="text-right font-mono">{Number(bet.amount).toFixed(0)}</TableCell>
            <TableCell className="text-right font-mono text-sm">{formatOdds(bet.odds)}</TableCell>
            <TableCell className="text-right">
              <ResultBadge result={bet.result} payout={bet.payout} wager={bet.amount} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ResultBadge({ result, payout, wager }: { result: string; payout: number; wager: number }) {
  if (result === "pending") {
    return <Badge variant="outline">Pending</Badge>;
  }
  if (result === "won") {
    return (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
        +{(Number(payout) - Number(wager)).toFixed(2)}
      </Badge>
    );
  }
  if (result === "push") {
    return <Badge variant="secondary">Push</Badge>;
  }
  return (
    <Badge className="bg-red-500/20 text-red-500 border-red-500/30">
      -{Number(wager).toFixed(0)}
    </Badge>
  );
}

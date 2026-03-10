"use client";

import { DAILY_CREDITS } from "@/lib/odds";
import type { DailyLeaderboardRow, WeeklyLeaderboardRow } from "@/lib/leaderboards";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  results: DailyLeaderboardRow[] | WeeklyLeaderboardRow[];
  type: "daily" | "weekly";
}

export function LeaderboardTable({ results, type }: Props) {
  if (type === "daily") {
    const rows = results as DailyLeaderboardRow[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Banked</TableHead>
            <TableHead className="text-right">W-L-P</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{placementBadge(r.placement)}</TableCell>
              <TableCell className="font-medium">{r.profiles?.display_name ?? "Unknown"}</TableCell>
              <TableCell className={`text-right font-mono ${r.bankedCredits >= DAILY_CREDITS ? "text-green-500" : "text-red-500"}`}>
                {r.bankedCredits.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {r.wins}-{r.losses}-{r.pushes}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const rows = results as WeeklyLeaderboardRow[];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Banked</TableHead>
          <TableHead className="text-right">W-L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{placementBadge(r.placement)}</TableCell>
            <TableCell className="font-medium">{r.profiles?.display_name ?? "Unknown"}</TableCell>
            <TableCell className={`text-right font-mono ${r.bankedCredits >= DAILY_CREDITS * r.scoredDays ? "text-green-500" : "text-red-500"}`}>
              {r.bankedCredits.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {r.totalWins}-{r.totalLosses}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function placementBadge(placement: number) {
  if (placement === 1) return <Badge className="bg-amber-500 text-black hover:bg-amber-500">1</Badge>;
  if (placement === 2) return <Badge className="bg-slate-400 text-black hover:bg-slate-400">2</Badge>;
  if (placement === 3) return <Badge className="bg-orange-700 text-white hover:bg-orange-700">3</Badge>;
  return <span>{placement}</span>;
}

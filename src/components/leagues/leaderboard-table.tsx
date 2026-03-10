"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DailyRow {
  placement: number;
  net_profit: number;
  wins: number;
  losses: number;
  pushes: number;
  points: number;
  profiles: { display_name: string } | null;
}

interface WeeklyRow {
  placement: number;
  total_profit: number;
  total_wins: number;
  total_losses: number;
  total_points: number;
  profiles: { display_name: string } | null;
}

interface Props {
  results: DailyRow[] | WeeklyRow[];
  type: "daily" | "weekly";
}

export function LeaderboardTable({ results, type }: Props) {
  if (type === "daily") {
    const rows = results as DailyRow[];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">W-L-P</TableHead>
            <TableHead className="text-right">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{placementBadge(r.placement)}</TableCell>
              <TableCell className="font-medium">{r.profiles?.display_name ?? "Unknown"}</TableCell>
              <TableCell className={`text-right font-mono ${r.net_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
                {r.net_profit >= 0 ? "+" : ""}{r.net_profit.toFixed(2)}
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {r.wins}-{r.losses}-{r.pushes}
              </TableCell>
              <TableCell className="text-right font-bold">{r.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  const rows = results as WeeklyRow[];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Player</TableHead>
          <TableHead className="text-right">Points</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="text-right">W-L</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            <TableCell className="font-medium">{placementBadge(r.placement)}</TableCell>
            <TableCell className="font-medium">{r.profiles?.display_name ?? "Unknown"}</TableCell>
            <TableCell className="text-right font-bold">{r.total_points}</TableCell>
            <TableCell className={`text-right font-mono ${r.total_profit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {r.total_profit >= 0 ? "+" : ""}{r.total_profit.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {r.total_wins}-{r.total_losses}
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

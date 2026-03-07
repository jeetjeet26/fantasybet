"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatOdds } from "@/lib/odds";
import {
  getDailyBetSlip,
  refreshDailyBetSlip,
  type DailyBetSlipResponse,
  type DailyBetSlipItem,
} from "@/lib/actions/bets";

interface Props {
  leagueId: string;
}

const POLL_MS = 60 * 60 * 1000;

export function DailyBetSlip({ leagueId }: Props) {
  const [data, setData] = useState<DailyBetSlipResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadInitial() {
      setPending(true);
      const next = await getDailyBetSlip(leagueId);
      if (!active) return;
      setData(next);
      setError(next.error ?? null);
      setPending(false);
    }

    async function pollLive() {
      const next = await refreshDailyBetSlip(leagueId);
      if (!active) return;
      setData(next);
      setError(next.error ?? null);
    }

    void loadInitial();
    const id = setInterval(() => {
      void pollLive();
    }, POLL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [leagueId]);

  const updatedLabel = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  const summary = data?.summary;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">My Daily Bet Slip</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              setPending(true);
              const next = await refreshDailyBetSlip(leagueId);
              setData(next);
              setError(next.error ?? null);
              setPending(false);
            }}
            disabled={pending}
          >
            {pending ? "Refreshing..." : "Refresh live"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Tracks your bets and auto-refreshes every hour. Last update: {updatedLabel || "—"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        {summary ? (
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Stat label="Bets" value={summary.totalBets.toString()} />
            <Stat label="Pending" value={summary.pendingBets.toString()} />
            <Stat label="Record" value={`${summary.wins}-${summary.losses}-${summary.pushes}`} />
            <Stat
              label="Settled Net"
              value={`${summary.settledNet >= 0 ? "+" : ""}${summary.settledNet.toFixed(2)}`}
              positive={summary.settledNet >= 0}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading your bets...</p>
        )}

        <Separator />

        {!data || data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bets placed yet today. Place bets in Today&apos;s Games and they will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {data.items.map((item) => (
              <SlipRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={positive === undefined ? "font-mono text-sm" : positive ? "font-mono text-sm text-green-500" : "font-mono text-sm text-red-500"}>
        {value}
      </p>
    </div>
  );
}

function SlipRow({ item }: { item: DailyBetSlipItem }) {
  const gameTime = new Date(item.game.commenceTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const pickLabel = renderPick(item);

  return (
    <div className="rounded-md border p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {item.game.awayTeam} @ {item.game.homeTeam}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {gameTime}
          </Badge>
          <ResultBadge result={item.result} />
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>{pickLabel}</span>
        <span>•</span>
        <span>{formatOdds(item.odds)}</span>
        <span>•</span>
        <span>Wager {item.amount.toFixed(2)}</span>
        <span>•</span>
        {item.result === "pending" ? (
          <span>To Win {item.potentialPayout.toFixed(2)}</span>
        ) : (
          <span>Payout {item.payout.toFixed(2)}</span>
        )}
      </div>
      {item.game.status === "settled" && item.game.homeScore !== null && item.game.awayScore !== null ? (
        <p className="mt-1 text-xs font-mono">
          Final: {item.game.awayScore} - {item.game.homeScore}
        </p>
      ) : null}
    </div>
  );
}

function ResultBadge({ result }: { result: DailyBetSlipItem["result"] }) {
  if (result === "won") return <Badge className="text-[10px] bg-green-600 text-white hover:bg-green-600">Won</Badge>;
  if (result === "lost") return <Badge variant="destructive" className="text-[10px]">Lost</Badge>;
  if (result === "push") return <Badge variant="secondary" className="text-[10px]">Push</Badge>;
  return <Badge variant="outline" className="text-[10px]">Pending</Badge>;
}

function renderPick(item: DailyBetSlipItem): string {
  if (item.betType === "moneyline") {
    return item.betPick === "home" ? `${item.game.homeTeam} ML` : `${item.game.awayTeam} ML`;
  }
  if (item.betType === "spread") {
    return item.betPick === "home" ? `${item.game.homeTeam} Spread` : `${item.game.awayTeam} Spread`;
  }
  return item.betPick === "over" ? "Total Over" : "Total Under";
}

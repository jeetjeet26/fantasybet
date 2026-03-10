"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GameCard } from "./game-card";
import { BetSlip } from "./bet-slip";
import type { DailySlate, SlateGame, Bet, BetType, BetPick } from "@/lib/types/database";
import { DAILY_CREDITS } from "@/lib/odds";

export interface BetSelection {
  gameId: string;
  gameName: string;
  betType: BetType;
  betPick: BetPick;
  odds: number;
  label: string;
}

interface Props {
  leagueId: string;
  slate: DailySlate | null;
  games: SlateGame[];
  myBets: Bet[];
  creditsRemaining: number;
}

export function LeagueBetting({ leagueId, slate, games, myBets, creditsRemaining: initialCredits }: Props) {
  const [selections, setSelections] = useState<BetSelection[]>([]);
  const [credits, setCredits] = useState(initialCredits);
  const openGames = games.filter((game) => game.status === "upcoming").length;
  const placedBetCount = myBets.length;
  const selectedCount = selections.length;
  const slateLock = games[0]?.commence_time ?? slate?.locked_at ?? null;

  function addSelection(sel: BetSelection) {
    if (selections.find((s) => s.gameId === sel.gameId && s.betType === sel.betType && s.betPick === sel.betPick)) {
      return;
    }
    setSelections((prev) => [...prev, sel]);
  }

  function removeSelection(index: number) {
    setSelections((prev) => prev.filter((_, i) => i !== index));
  }

  function onBetsPlaced(totalWagered: number) {
    setCredits((prev) => prev - totalWagered);
    setSelections([]);
  }

  if (!slate) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-lg font-medium">No games today</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lines are posted each morning. Check back tomorrow or ask your league to run the daily snapshot.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="border-0 bg-gradient-to-br from-primary/10 via-background to-background ring-1 ring-primary/15">
          <CardContent className="space-y-4 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Badge variant="outline" className="border-primary/20 bg-background/70">
                  Today&apos;s slate
                </Badge>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">Five games. Quick decisions.</p>
                  <p className="text-sm text-muted-foreground">
                    Scan the board, lock in the lines you like, and use all {DAILY_CREDITS} credits before the slate starts.
                  </p>
                </div>
              </div>
              <CreditsBadge credits={credits} />
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <SlateMetric label="Games" value={`${games.length}`} helper={`${openGames} still open`} />
              <SlateMetric label="On your card" value={`${selectedCount}`} helper={selectedCount === 1 ? "1 pick ready" : "Ready to place"} />
              <SlateMetric label="Placed today" value={`${placedBetCount}`} helper={placedBetCount === 0 ? "No bets yet" : "Already submitted"} />
              <SlateMetric
                label="Locks"
                value={slateLock ? formatLockTime(slateLock) : "Soon"}
                helper={slate.status === "open" ? "Betting is open" : "Slate closed"}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 rounded-xl border bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              {games.length} games on deck
            </p>
            <p className="text-sm text-muted-foreground">
              {slate.status === "open"
                ? "Tap any line to add it to your card. Your current bet options stay exactly the same."
                : "This slate is no longer open for new bets."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={slate.status === "open" ? "default" : "secondary"}>
              {slate.status === "open" ? "Betting open" : slate.status}
            </Badge>
            <Separator orientation="vertical" className="hidden h-5 sm:block" />
            <span className="text-sm text-muted-foreground">{openGames} open now</span>
          </div>
        </div>
        {games.map((game) => {
          const gameBets = myBets.filter((b) => b.slate_game_id === game.id);
          const selectedBets = selections.filter((selection) => selection.gameId === game.id);
          return (
            <GameCard
              key={game.id}
              game={game}
              myBets={gameBets}
              selectedBets={selectedBets}
              onSelectBet={addSelection}
              disabled={slate.status !== "open"}
            />
          );
        })}
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <BetSlip
          leagueId={leagueId}
          selections={selections}
          onRemove={removeSelection}
          creditsRemaining={credits}
          onBetsPlaced={onBetsPlaced}
        />
      </div>
    </div>
  );
}

function CreditsBadge({ credits }: { credits: number }) {
  return (
    <Badge
      variant={credits > 0 ? "default" : "destructive"}
      className="px-3 py-1 text-sm shadow-sm"
    >
      {credits.toFixed(0)} / {DAILY_CREDITS} credits
    </Badge>
  );
}

function SlateMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function formatLockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

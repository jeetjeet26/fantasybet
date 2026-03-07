"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {games.length} games &middot; {slate.status === "open" ? "Betting open" : slate.status}
          </p>
          <CreditsBadge credits={credits} />
        </div>
        {games.map((game) => {
          const gameBets = myBets.filter((b) => b.slate_game_id === game.id);
          return (
            <GameCard
              key={game.id}
              game={game}
              myBets={gameBets}
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
      className="text-sm px-3 py-1"
    >
      {credits.toFixed(0)} / {DAILY_CREDITS} credits
    </Badge>
  );
}

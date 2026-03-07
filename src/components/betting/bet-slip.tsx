"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatOdds, calculatePayout } from "@/lib/odds";
import { placeBet } from "@/lib/actions/bets";
import { toast } from "sonner";
import type { BetSelection } from "./league-betting";

interface Props {
  leagueId: string;
  selections: BetSelection[];
  onRemove: (index: number) => void;
  creditsRemaining: number;
  onBetsPlaced: (totalWagered: number) => void;
}

export function BetSlip({ leagueId, selections, onRemove, creditsRemaining, onBetsPlaced }: Props) {
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);

  function setAmount(index: number, value: string) {
    setAmounts((prev) => ({ ...prev, [index]: value }));
  }

  const totalWagered = selections.reduce((sum, _, i) => {
    return sum + (parseFloat(amounts[i] || "0") || 0);
  }, 0);

  const totalPotentialPayout = selections.reduce((sum, sel, i) => {
    const amt = parseFloat(amounts[i] || "0") || 0;
    return sum + (amt > 0 ? calculatePayout(amt, sel.odds) : 0);
  }, 0);

  async function handleSubmit() {
    if (totalWagered > creditsRemaining) {
      toast.error("Not enough credits!");
      return;
    }

    setPending(true);
    let placedTotal = 0;

    for (let i = 0; i < selections.length; i++) {
      const amt = parseFloat(amounts[i] || "0") || 0;
      if (amt <= 0) continue;

      const sel = selections[i];
      const result = await placeBet({
        leagueId,
        slateGameId: sel.gameId,
        betType: sel.betType,
        betPick: sel.betPick,
        amount: amt,
        odds: sel.odds,
      });

      if (result?.error) {
        toast.error(`Failed: ${sel.label} — ${result.error}`);
      } else {
        placedTotal += amt;
      }
    }

    if (placedTotal > 0) {
      toast.success(`Placed ${selections.length} bet(s) for ${placedTotal.toFixed(0)} credits`);
      onBetsPlaced(placedTotal);
      setAmounts({});
    }

    setPending(false);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bet Slip</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Click on odds to add bets
          </p>
        ) : (
          <>
            {selections.map((sel, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sel.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{sel.gameName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono">{formatOdds(sel.odds)}</span>
                    <button
                      onClick={() => onRemove(i)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Wager"
                    min={1}
                    max={creditsRemaining}
                    value={amounts[i] || ""}
                    onChange={(e) => setAmount(i, e.target.value)}
                    className="h-8 text-sm"
                  />
                  {(parseFloat(amounts[i] || "0") || 0) > 0 && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      → {calculatePayout(parseFloat(amounts[i] || "0"), sel.odds).toFixed(2)}
                    </span>
                  )}
                </div>
                {i < selections.length - 1 && <Separator />}
              </div>
            ))}

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total wagered</span>
                <span className="font-mono">{totalWagered.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Potential payout</span>
                <span className="font-mono text-green-500">{totalPotentialPayout.toFixed(2)}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={pending || totalWagered === 0 || totalWagered > creditsRemaining}
            >
              {pending
                ? "Placing bets..."
                : totalWagered > creditsRemaining
                  ? "Not enough credits"
                  : `Place Bets (${totalWagered.toFixed(0)} credits)`}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

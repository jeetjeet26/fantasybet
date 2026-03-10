"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const activeSelectionCount = selections.filter((_, i) => (parseFloat(amounts[i] || "0") || 0) > 0).length;
  const creditsAfterEntry = creditsRemaining - totalWagered;

  async function handleSubmit() {
    if (totalWagered > creditsRemaining) {
      toast.error("Not enough credits!");
      return;
    }

    setPending(true);
    let placedTotal = 0;
    let placedCount = 0;

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
        placedCount += 1;
      }
    }

    if (placedTotal > 0) {
      toast.success(`Placed ${placedCount} bet(s) for ${placedTotal.toFixed(0)} credits`);
      onBetsPlaced(placedTotal);
      setAmounts({});
    }

    setPending(false);
  }

  return (
    <Card className="border-0 bg-gradient-to-b from-card to-muted/20 ring-1 ring-foreground/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Your Card</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add lines, assign credits, and submit everything in one go.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {creditsRemaining.toFixed(0)} left
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {selections.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center">
            <p className="text-sm font-medium">No picks on your card yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap any line from today&apos;s slate and it will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <SlipMetric label="Selections" value={`${selections.length}`} />
              <SlipMetric label="Entered" value={`${activeSelectionCount}`} />
              <SlipMetric
                label="After submit"
                value={creditsAfterEntry >= 0 ? `${creditsAfterEntry.toFixed(0)}` : "—"}
                tone={creditsAfterEntry < 0 ? "danger" : undefined}
              />
            </div>

            {selections.map((sel, i) => (
              <div key={i} className="space-y-2 rounded-xl border bg-background/80 p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">{sel.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{sel.gameName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {formatOdds(sel.odds)}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => onRemove(i)}
                      className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Wager
                    </label>
                    <Input
                      type="number"
                      placeholder="Enter credits"
                      min={1}
                      max={creditsRemaining}
                      value={amounts[i] || ""}
                      onChange={(e) => setAmount(i, e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 px-3 py-2 text-right">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">To win</p>
                    <p className="font-mono text-sm">
                      {(parseFloat(amounts[i] || "0") || 0) > 0
                        ? calculatePayout(parseFloat(amounts[i] || "0"), sel.odds).toFixed(2)
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <Separator />

            <div className="space-y-2 rounded-xl border bg-background/80 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total wagered</span>
                <span className="font-mono">{totalWagered.toFixed(0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential payout</span>
                <span className="font-mono text-green-500">{totalPotentialPayout.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credits after submit</span>
                <span className={creditsAfterEntry >= 0 ? "font-mono" : "font-mono text-destructive"}>
                  {creditsAfterEntry >= 0 ? creditsAfterEntry.toFixed(0) : "Over limit"}
                </span>
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

function SlipMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={tone === "danger" ? "mt-1 text-lg font-semibold text-destructive" : "mt-1 text-lg font-semibold"}>
        {value}
      </p>
    </div>
  );
}

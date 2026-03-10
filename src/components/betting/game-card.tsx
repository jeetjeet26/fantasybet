"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOdds, formatSpread } from "@/lib/odds";
import { cn } from "@/lib/utils";
import type { SlateGame, Bet, BetType, BetPick } from "@/lib/types/database";
import type { BetSelection } from "./league-betting";

interface Props {
  game: SlateGame;
  myBets: Bet[];
  selectedBets: BetSelection[];
  onSelectBet: (sel: BetSelection) => void;
  disabled: boolean;
}

const SPORT_LABELS: Record<string, string> = {
  americanfootball_nfl: "NFL",
  basketball_nba: "NBA",
  baseball_mlb: "MLB",
  icehockey_nhl: "NHL",
  americanfootball_ncaaf: "NCAAF",
  basketball_ncaab: "NCAAB",
};

export function GameCard({ game, myBets, selectedBets, onSelectBet, disabled }: Props) {
  const gameTime = new Date(game.commence_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const gameDate = new Date(game.commence_time).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const isStarted = game.status !== "upcoming";
  const selectionCount = selectedBets.length;

  function select(betType: BetType, betPick: BetPick, odds: number, label: string) {
    onSelectBet({
      gameId: game.id,
      gameName: `${game.away_team} @ ${game.home_team}`,
      betType,
      betPick,
      odds,
      label,
    });
  }

  const hasBetOn = (type: BetType, pick: BetPick) =>
    myBets.some((b) => b.bet_type === type && b.bet_pick === pick);

  const isSelected = (type: BetType, pick: BetPick) =>
    selectedBets.some((b) => b.betType === type && b.betPick === pick);

  return (
    <Card className={cn("transition-all", isStarted ? "opacity-70" : "hover:shadow-sm")}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {SPORT_LABELS[game.sport_key] ?? game.sport_title}
            </Badge>
            <span className="text-xs text-muted-foreground">{gameDate}</span>
            <span className="text-xs text-muted-foreground">{gameTime}</span>
          </div>
          <div className="flex items-center gap-2">
            {selectionCount > 0 && !isStarted ? (
              <Badge variant="secondary" className="text-xs">
                {selectionCount} on card
              </Badge>
            ) : null}
            {isStarted && (
              <Badge variant="secondary" className="text-xs">
                {game.status === "settled" ? "Final" : "Live"}
              </Badge>
            )}
            {game.status === "settled" && game.home_score !== null ? (
              <span className="font-mono text-sm font-bold">
                {game.away_score} - {game.home_score}
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <TeamPill name={game.away_team} align="right" />
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Matchup</p>
            <p className="text-sm font-semibold tracking-wide">@</p>
          </div>
          <TeamPill name={game.home_team} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Spread Column */}
          <BetGroup title="Spread" subtitle="Pick a side against the line">
            <OddsButton
              label={`${game.away_team.split(" ").pop()} ${formatSpread(game.spread_away)}`}
              odds={game.spread_away_odds}
              onClick={() => select("spread", "away", game.spread_away_odds!, `${game.away_team} ${formatSpread(game.spread_away)}`)}
              disabled={disabled || isStarted || !game.spread_away_odds}
              placed={hasBetOn("spread", "away")}
              selected={isSelected("spread", "away")}
            />
            <OddsButton
              label={`${game.home_team.split(" ").pop()} ${formatSpread(game.spread_home)}`}
              odds={game.spread_home_odds}
              onClick={() => select("spread", "home", game.spread_home_odds!, `${game.home_team} ${formatSpread(game.spread_home)}`)}
              disabled={disabled || isStarted || !game.spread_home_odds}
              placed={hasBetOn("spread", "home")}
              selected={isSelected("spread", "home")}
            />
          </BetGroup>

          {/* Moneyline Column */}
          <BetGroup title="Moneyline" subtitle="Pick the straight winner">
            <OddsButton
              label={game.away_team.split(" ").pop()!}
              odds={game.moneyline_away}
              onClick={() => select("moneyline", "away", game.moneyline_away!, `${game.away_team} ML`)}
              disabled={disabled || isStarted || !game.moneyline_away}
              placed={hasBetOn("moneyline", "away")}
              selected={isSelected("moneyline", "away")}
            />
            <OddsButton
              label={game.home_team.split(" ").pop()!}
              odds={game.moneyline_home}
              onClick={() => select("moneyline", "home", game.moneyline_home!, `${game.home_team} ML`)}
              disabled={disabled || isStarted || !game.moneyline_home}
              placed={hasBetOn("moneyline", "home")}
              selected={isSelected("moneyline", "home")}
            />
          </BetGroup>

          {/* Total Column */}
          <BetGroup title="Total" subtitle="Pick over or under">
            <OddsButton
              label={`O ${game.total_over ?? "-"}`}
              odds={game.total_over_odds}
              onClick={() => select("over_under", "over", game.total_over_odds!, `Over ${game.total_over}`)}
              disabled={disabled || isStarted || !game.total_over_odds}
              placed={hasBetOn("over_under", "over")}
              selected={isSelected("over_under", "over")}
            />
            <OddsButton
              label={`U ${game.total_under ?? "-"}`}
              odds={game.total_under_odds}
              onClick={() => select("over_under", "under", game.total_under_odds!, `Under ${game.total_under}`)}
              disabled={disabled || isStarted || !game.total_under_odds}
              placed={hasBetOn("over_under", "under")}
              selected={isSelected("over_under", "under")}
            />
          </BetGroup>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamPill({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  return (
    <div className={cn("rounded-xl border bg-muted/30 px-3 py-2", align === "right" && "text-left sm:text-right")}>
      <p className="truncate text-sm font-semibold">{name}</p>
    </div>
  );
}

function BetGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3 text-center">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function OddsButton({
  label,
  odds,
  onClick,
  disabled,
  placed,
  selected,
}: {
  label: string;
  odds: number | null;
  onClick: () => void;
  disabled: boolean;
  placed: boolean;
  selected: boolean;
}) {
  return (
    <Button
      variant={placed ? "default" : selected ? "secondary" : "outline"}
      size="sm"
      className={cn(
        "h-auto w-full flex-col gap-0 py-2 text-xs",
        selected && !placed && "border-primary/25 bg-primary/10 text-foreground"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="truncate">{label}</span>
      <span className={cn("font-mono text-[10px]", selected || placed ? "text-current/70" : "text-muted-foreground")}>
        {formatOdds(odds)}
      </span>
    </Button>
  );
}

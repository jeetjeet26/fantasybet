"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatOdds, formatSpread } from "@/lib/odds";
import type { SlateGame, Bet, BetType, BetPick } from "@/lib/types/database";
import type { BetSelection } from "./league-betting";

interface Props {
  game: SlateGame;
  myBets: Bet[];
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

export function GameCard({ game, myBets, onSelectBet, disabled }: Props) {
  const gameTime = new Date(game.commence_time).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isStarted = game.status !== "upcoming";

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

  return (
    <Card className={isStarted ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {SPORT_LABELS[game.sport_key] ?? game.sport_title}
            </Badge>
            <span className="text-xs text-muted-foreground">{gameTime}</span>
          </div>
          {isStarted && (
            <Badge variant="secondary" className="text-xs">
              {game.status === "settled" ? "Final" : "Live"}
            </Badge>
          )}
          {game.status === "settled" && game.home_score !== null && (
            <span className="font-mono text-sm font-bold">
              {game.away_score} - {game.home_score}
            </span>
          )}
        </div>
        <div className="mt-1">
          <p className="text-sm font-medium">{game.away_team}</p>
          <p className="text-sm font-medium">@ {game.home_team}</p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Spread Column */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Spread</p>
            <OddsButton
              label={`${game.away_team.split(" ").pop()} ${formatSpread(game.spread_away)}`}
              odds={game.spread_away_odds}
              onClick={() => select("spread", "away", game.spread_away_odds!, `${game.away_team} ${formatSpread(game.spread_away)}`)}
              disabled={disabled || isStarted || !game.spread_away_odds}
              placed={hasBetOn("spread", "away")}
            />
            <OddsButton
              label={`${game.home_team.split(" ").pop()} ${formatSpread(game.spread_home)}`}
              odds={game.spread_home_odds}
              onClick={() => select("spread", "home", game.spread_home_odds!, `${game.home_team} ${formatSpread(game.spread_home)}`)}
              disabled={disabled || isStarted || !game.spread_home_odds}
              placed={hasBetOn("spread", "home")}
            />
          </div>

          {/* Moneyline Column */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ML</p>
            <OddsButton
              label={game.away_team.split(" ").pop()!}
              odds={game.moneyline_away}
              onClick={() => select("moneyline", "away", game.moneyline_away!, `${game.away_team} ML`)}
              disabled={disabled || isStarted || !game.moneyline_away}
              placed={hasBetOn("moneyline", "away")}
            />
            <OddsButton
              label={game.home_team.split(" ").pop()!}
              odds={game.moneyline_home}
              onClick={() => select("moneyline", "home", game.moneyline_home!, `${game.home_team} ML`)}
              disabled={disabled || isStarted || !game.moneyline_home}
              placed={hasBetOn("moneyline", "home")}
            />
          </div>

          {/* Total Column */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <OddsButton
              label={`O ${game.total_over ?? "-"}`}
              odds={game.total_over_odds}
              onClick={() => select("over_under", "over", game.total_over_odds!, `Over ${game.total_over}`)}
              disabled={disabled || isStarted || !game.total_over_odds}
              placed={hasBetOn("over_under", "over")}
            />
            <OddsButton
              label={`U ${game.total_under ?? "-"}`}
              odds={game.total_under_odds}
              onClick={() => select("over_under", "under", game.total_under_odds!, `Under ${game.total_under}`)}
              disabled={disabled || isStarted || !game.total_under_odds}
              placed={hasBetOn("over_under", "under")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OddsButton({
  label,
  odds,
  onClick,
  disabled,
  placed,
}: {
  label: string;
  odds: number | null;
  onClick: () => void;
  disabled: boolean;
  placed: boolean;
}) {
  return (
    <Button
      variant={placed ? "default" : "outline"}
      size="sm"
      className="w-full text-xs h-auto py-1.5 flex flex-col gap-0"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="truncate">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {formatOdds(odds)}
      </span>
    </Button>
  );
}

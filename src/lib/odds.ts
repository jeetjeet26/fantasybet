export function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

export function calculatePayout(wager: number, americanOdds: number): number {
  const decimal = americanToDecimal(americanOdds);
  return Math.round(wager * decimal * 100) / 100;
}

export function formatOdds(odds: number | null): string {
  if (odds === null) return "N/A";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function formatSpread(spread: number | null): string {
  if (spread === null) return "N/A";
  return spread > 0 ? `+${spread}` : `${spread}`;
}

const SPORT_PRIORITY: Record<string, number> = {
  americanfootball_nfl: 1,
  basketball_nba: 2,
  baseball_mlb: 3,
  icehockey_nhl: 4,
  americanfootball_ncaaf: 5,
  basketball_ncaab: 6,
};

export function sportPriority(sportKey: string): number {
  return SPORT_PRIORITY[sportKey] ?? 99;
}

export const DAILY_CREDITS = 100;
export const GAMES_PER_SLATE = 5;

export const PLACEMENT_POINTS: Record<number, number> = {
  1: 10,
  2: 8,
  3: 6,
  4: 5,
  5: 4,
  6: 3,
  7: 2,
};

export function getPlacementPoints(place: number): number {
  return PLACEMENT_POINTS[place] ?? 1;
}

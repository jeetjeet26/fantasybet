import type { Tables, Enums } from "./supabase";

export type BetType = Enums<"bet_type">;
export type BetPick = Enums<"bet_pick">;
export type BetResult = Enums<"bet_result">;
export type SlateStatus = Enums<"slate_status">;
export type GameStatus = Enums<"game_status">;
export type InviteStatus = Enums<"invite_status">;
export type InviteMode = Enums<"invite_mode">;
export type LeagueMemberRole = Enums<"league_member_role">;

export type Profile = Tables<"profiles">;
export type League = Tables<"leagues">;
export type LeagueMember = Tables<"league_members">;
export type LeagueInvite = Tables<"league_invites">;
export type DailySlate = Tables<"daily_slates">;
export type SlateGame = Tables<"slate_games">;
export type Bet = Tables<"bets">;
export type DailyResult = Tables<"daily_results">;
export type WeeklyResult = Tables<"weekly_results">;

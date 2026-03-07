export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bets: {
        Row: {
          amount: number
          bet_pick: Database["public"]["Enums"]["bet_pick"]
          bet_type: Database["public"]["Enums"]["bet_type"]
          created_at: string
          id: string
          odds: number
          payout: number
          potential_payout: number
          result: Database["public"]["Enums"]["bet_result"]
          slate_game_id: string
          user_id: string
        }
        Insert: {
          amount: number
          bet_pick: Database["public"]["Enums"]["bet_pick"]
          bet_type: Database["public"]["Enums"]["bet_type"]
          created_at?: string
          id?: string
          odds: number
          payout?: number
          potential_payout: number
          result?: Database["public"]["Enums"]["bet_result"]
          slate_game_id: string
          user_id: string
        }
        Update: {
          amount?: number
          bet_pick?: Database["public"]["Enums"]["bet_pick"]
          bet_type?: Database["public"]["Enums"]["bet_type"]
          created_at?: string
          id?: string
          odds?: number
          payout?: number
          potential_payout?: number
          result?: Database["public"]["Enums"]["bet_result"]
          slate_game_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_slate_game_id_fkey"
            columns: ["slate_game_id"]
            isOneToOne: false
            referencedRelation: "slate_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_results: {
        Row: {
          date: string
          id: string
          league_id: string
          losses: number
          net_profit: number
          placement: number
          points: number
          pushes: number
          total_wagered: number
          total_won: number
          user_id: string
          wins: number
        }
        Insert: {
          date: string
          id?: string
          league_id: string
          losses?: number
          net_profit?: number
          placement?: number
          points?: number
          pushes?: number
          total_wagered?: number
          total_won?: number
          user_id: string
          wins?: number
        }
        Update: {
          date?: string
          id?: string
          league_id?: string
          losses?: number
          net_profit?: number
          placement?: number
          points?: number
          pushes?: number
          total_wagered?: number
          total_won?: number
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_results_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_slates: {
        Row: {
          created_at: string
          date: string
          id: string
          league_id: string
          locked_at: string | null
          status: Database["public"]["Enums"]["slate_status"]
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          league_id: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["slate_status"]
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          league_id?: string
          locked_at?: string | null
          status?: Database["public"]["Enums"]["slate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "daily_slates_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_invites: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_email: string
          league_id: string
          status: Database["public"]["Enums"]["invite_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_email: string
          league_id: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_email?: string
          league_id?: string
          status?: Database["public"]["Enums"]["invite_status"]
        }
        Relationships: [
          {
            foreignKeyName: "league_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_invites_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          link: string | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          link?: string | null
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      league_members: {
        Row: {
          id: string
          joined_at: string
          league_id: string
          role: Database["public"]["Enums"]["league_member_role"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          league_id: string
          role?: Database["public"]["Enums"]["league_member_role"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          league_id?: string
          role?: Database["public"]["Enums"]["league_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_members_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          invite_code: string
          invite_mode: Database["public"]["Enums"]["invite_mode"]
          invite_slug: string | null
          logo_url: string | null
          max_members: number | null
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          invite_code?: string
          invite_mode?: Database["public"]["Enums"]["invite_mode"]
          invite_slug?: string | null
          logo_url?: string | null
          max_members?: number | null
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          invite_code?: string
          invite_mode?: Database["public"]["Enums"]["invite_mode"]
          invite_slug?: string | null
          logo_url?: string | null
          max_members?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leagues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      slate_games: {
        Row: {
          away_score: number | null
          away_team: string
          commence_time: string
          home_score: number | null
          home_team: string
          id: string
          moneyline_away: number | null
          moneyline_home: number | null
          slate_id: string
          sport_key: string
          sport_title: string
          spread_away: number | null
          spread_away_odds: number | null
          spread_home: number | null
          spread_home_odds: number | null
          status: Database["public"]["Enums"]["game_status"]
          total_over: number | null
          total_over_odds: number | null
          total_under: number | null
          total_under_odds: number | null
        }
        Insert: {
          away_score?: number | null
          away_team: string
          commence_time: string
          home_score?: number | null
          home_team: string
          id?: string
          moneyline_away?: number | null
          moneyline_home?: number | null
          slate_id: string
          sport_key: string
          sport_title: string
          spread_away?: number | null
          spread_away_odds?: number | null
          spread_home?: number | null
          spread_home_odds?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          total_over?: number | null
          total_over_odds?: number | null
          total_under?: number | null
          total_under_odds?: number | null
        }
        Update: {
          away_score?: number | null
          away_team?: string
          commence_time?: string
          home_score?: number | null
          home_team?: string
          id?: string
          moneyline_away?: number | null
          moneyline_home?: number | null
          slate_id?: string
          sport_key?: string
          sport_title?: string
          spread_away?: number | null
          spread_away_odds?: number | null
          spread_home?: number | null
          spread_home_odds?: number | null
          status?: Database["public"]["Enums"]["game_status"]
          total_over?: number | null
          total_over_odds?: number | null
          total_under?: number | null
          total_under_odds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "slate_games_slate_id_fkey"
            columns: ["slate_id"]
            isOneToOne: false
            referencedRelation: "daily_slates"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_results: {
        Row: {
          id: string
          league_id: string
          placement: number
          total_losses: number
          total_points: number
          total_profit: number
          total_wins: number
          user_id: string
          week_start: string
        }
        Insert: {
          id?: string
          league_id: string
          placement?: number
          total_losses?: number
          total_points?: number
          total_profit?: number
          total_wins?: number
          user_id: string
          week_start: string
        }
        Update: {
          id?: string
          league_id?: string
          placement?: number
          total_losses?: number
          total_points?: number
          total_profit?: number
          total_wins?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_results_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_payout: {
        Args: { american_odds: number; wager: number }
        Returns: number
      }
      is_league_member: { Args: { check_league_id: string }; Returns: boolean }
      placement_points: { Args: { place: number }; Returns: number }
      user_league_ids: { Args: Record<string, never>; Returns: string[] }
    }
    Enums: {
      bet_pick: "home" | "away" | "over" | "under"
      bet_result: "pending" | "won" | "lost" | "push"
      bet_type: "spread" | "moneyline" | "over_under"
      game_status: "upcoming" | "live" | "settled" | "cancelled"
      invite_mode: "any_member" | "commissioner_only"
      invite_status: "pending" | "accepted" | "declined"
      league_member_role: "commissioner" | "member"
      notification_type: "slate_ready" | "invite"
      slate_status: "open" | "locked" | "settled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

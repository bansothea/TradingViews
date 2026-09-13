/**
 * Database types.
 *
 * Hand-maintained to match supabase/migrations. Once you have Docker or a
 * linked project, regenerate instead of editing by hand:
 *
 *   supabase gen types typescript --local > src/types/database.ts
 *   # or, against the hosted project:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 */

export type SignalAction = "BUY" | "SELL" | "HOLD";
export type SubscriptionTier = "free" | "pro" | "elite";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface IndicatorSnapshot {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  ema20: number;
  ema50: number;
  volume: number;
  close: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          tier: SubscriptionTier;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          tier?: SubscriptionTier;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          tier?: SubscriptionTier;
        };
        Relationships: [];
      };
      signals: {
        Row: {
          id: string;
          symbol: string;
          timeframe: string;
          bucket: string;
          action: SignalAction;
          price: number;
          confidence: number | null;
          rationale: string | null;
          indicators: Json;
          model: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          timeframe: string;
          bucket: string;
          action: SignalAction;
          price: number;
          confidence?: number | null;
          rationale?: string | null;
          indicators?: Json;
          model?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["signals"]["Insert"]>;
        Relationships: [];
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          timeframe: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          timeframe?: string;
        };
        Update: {
          symbol?: string;
          timeframe?: string;
        };
        Relationships: [];
      };
      signal_requests: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          timeframe: string;
          signal_id: string | null;
          cache_hit: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          timeframe: string;
          signal_id?: string | null;
          cache_hit?: boolean;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      get_quota_status: {
        Args: { p_user_id: string };
        Returns: { tier: SubscriptionTier; used: number; quota: number }[];
      };
      consume_quota: {
        Args: {
          p_user_id: string;
          p_symbol: string;
          p_timeframe: string;
          p_cache_hit?: boolean;
        };
        Returns: boolean;
      };
      tier_daily_limit: {
        Args: { p_tier: SubscriptionTier };
        Returns: number;
      };
    };
    Enums: {
      signal_action: SignalAction;
      subscription_tier: SubscriptionTier;
    };
    CompositeTypes: Record<never, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Signal = Tables<"signals">;
export type Watchlist = Tables<"watchlists">;
export type SignalRequest = Tables<"signal_requests">;

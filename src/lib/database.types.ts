// Generated types placeholder.
// Run `npx supabase gen types typescript --project-id <your-project-id>`
// to regenerate this file from your live schema.

export type Database = {
  public: {
    Tables: {
      // Will be populated by supabase gen types
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      generate_estimate: {
        Args: { p_season_id: number };
        Returns: number;
      };
    };
    Enums: {
      cost_category:
        | 'seeds'
        | 'fertiliser'
        | 'agrochem'
        | 'land_prep'
        | 'labour'
        | 'transport'
        | 'storage'
        | 'other';
      season_window: 'major' | 'minor' | 'dry';
      price_basis: 'subsidised' | 'open_market';
      estimate_method: 'benchmark' | 'blended' | 'history';
    };
  };
};

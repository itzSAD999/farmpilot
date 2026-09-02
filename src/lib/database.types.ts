export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      advice_rules: {
        Row: {
          category: Database["public"]["Enums"]["cost_category"]
          id: number
          message: string
        }
        Insert: {
          category: Database["public"]["Enums"]["cost_category"]
          id?: number
          message: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cost_category"]
          id?: number
          message?: string
        }
        Relationships: []
      }
      advice_translations: {
        Row: {
          advice_id: number
          created_at: string
          id: number
          language: string
          message: string
          reviewed: boolean
          source: string
        }
        Insert: {
          advice_id: number
          created_at?: string
          id?: number
          language: string
          message: string
          reviewed?: boolean
          source?: string
        }
        Update: {
          advice_id?: number
          created_at?: string
          id?: number
          language?: string
          message?: string
          reviewed?: boolean
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "advice_translations_advice_id_fkey"
            columns: ["advice_id"]
            isOneToOne: false
            referencedRelation: "advice_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          flag_threshold_pct: number
          id: boolean
          price_multiplier: number
          updated_at: string
        }
        Insert: {
          flag_threshold_pct?: number
          id?: boolean
          price_multiplier?: number
          updated_at?: string
        }
        Update: {
          flag_threshold_pct?: number
          id?: boolean
          price_multiplier?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          id: number
          limit_pesewas: number
          season_id: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          id?: number
          limit_pesewas: number
          season_id: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          id?: number
          limit_pesewas?: number
          season_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_benchmarks: {
        Row: {
          basis: Database["public"]["Enums"]["price_basis"]
          category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          id: number
          input_name: string
          price_pesewas: number
          source: string
          unit: string
          year: number
        }
        Insert: {
          basis?: Database["public"]["Enums"]["price_basis"]
          category: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          id?: number
          input_name: string
          price_pesewas: number
          source: string
          unit: string
          year: number
        }
        Update: {
          basis?: Database["public"]["Enums"]["price_basis"]
          category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          id?: number
          input_name?: string
          price_pesewas?: number
          source?: string
          unit?: string
          year?: number
        }
        Relationships: []
      }
      crop_input_norms: {
        Row: {
          benchmark_id: number
          category: Database["public"]["Enums"]["cost_category"]
          crop_id: number
          id: number
          quantity_per_acre: number
          season_window: Database["public"]["Enums"]["season_window"] | null
          source: string
        }
        Insert: {
          benchmark_id: number
          category: Database["public"]["Enums"]["cost_category"]
          crop_id: number
          id?: number
          quantity_per_acre: number
          season_window?: Database["public"]["Enums"]["season_window"] | null
          source: string
        }
        Update: {
          benchmark_id?: number
          category?: Database["public"]["Enums"]["cost_category"]
          crop_id?: number
          id?: number
          quantity_per_acre?: number
          season_window?: Database["public"]["Enums"]["season_window"] | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "crop_input_norms_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "cost_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_input_norms_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crop_input_norms_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v_crop_summary"
            referencedColumns: ["crop_id"]
          },
        ]
      }
      crops: {
        Row: {
          avg_yield_mt_ha: number | null
          created_at: string
          id: number
          local_name: string | null
          maturity_days: number | null
          name: string
          potential_yield_mt_ha: number | null
        }
        Insert: {
          avg_yield_mt_ha?: number | null
          created_at?: string
          id?: number
          local_name?: string | null
          maturity_days?: number | null
          name: string
          potential_yield_mt_ha?: number | null
        }
        Update: {
          avg_yield_mt_ha?: number | null
          created_at?: string
          id?: number
          local_name?: string | null
          maturity_days?: number | null
          name?: string
          potential_yield_mt_ha?: number | null
        }
        Relationships: []
      }
      estimate_lines: {
        Row: {
          advice: string | null
          benchmark_pesewas: number | null
          category: Database["public"]["Enums"]["cost_category"]
          estimate_id: number
          estimated_pesewas: number
          id: number
          is_actual: boolean
          is_flagged: boolean
          potential_saving_pesewas: number | null
          variance_pct: number | null
        }
        Insert: {
          advice?: string | null
          benchmark_pesewas?: number | null
          category: Database["public"]["Enums"]["cost_category"]
          estimate_id: number
          estimated_pesewas: number
          id?: number
          is_actual?: boolean
          is_flagged?: boolean
          potential_saving_pesewas?: number | null
          variance_pct?: number | null
        }
        Update: {
          advice?: string | null
          benchmark_pesewas?: number | null
          category?: Database["public"]["Enums"]["cost_category"]
          estimate_id?: number
          estimated_pesewas?: number
          id?: number
          is_actual?: boolean
          is_flagged?: boolean
          potential_saving_pesewas?: number | null
          variance_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "v_estimate_report"
            referencedColumns: ["estimate_id"]
          },
        ]
      }
      estimates: {
        Row: {
          area_acres: number
          created_at: string
          id: number
          method: Database["public"]["Enums"]["estimate_method"]
          price_multiplier: number
          season_id: number
          seasons_used: number
          total_pesewas: number
        }
        Insert: {
          area_acres: number
          created_at?: string
          id?: number
          method: Database["public"]["Enums"]["estimate_method"]
          price_multiplier: number
          season_id: number
          seasons_used?: number
          total_pesewas: number
        }
        Update: {
          area_acres?: number
          created_at?: string
          id?: number
          method?: Database["public"]["Enums"]["estimate_method"]
          price_multiplier?: number
          season_id?: number
          seasons_used?: number
          total_pesewas?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      farms: {
        Row: {
          check_in_day: string | null
          created_at: string
          district: string | null
          id: number
          name: string
          region: string | null
          total_area_acres: number
          user_id: string
        }
        Insert: {
          check_in_day?: string | null
          created_at?: string
          district?: string | null
          id?: number
          name: string
          region?: string | null
          total_area_acres: number
          user_id: string
        }
        Update: {
          check_in_day?: string | null
          created_at?: string
          district?: string | null
          id?: number
          name?: string
          region?: string | null
          total_area_acres?: number
          user_id?: string
        }
        Relationships: []
      }
      guide_steps: {
        Row: {
          detail: string
          guide_id: number
          heading: string
          id: number
          position: number
        }
        Insert: {
          detail: string
          guide_id: number
          heading: string
          id?: number
          position: number
        }
        Update: {
          detail?: string
          guide_id?: number
          heading?: string
          id?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_steps_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          body_markdown: string
          category: Database["public"]["Enums"]["cost_category"]
          created_at: string
          crop_id: number | null
          id: number
          region: string | null
          season_window: Database["public"]["Enums"]["season_window"] | null
          source: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body_markdown: string
          category: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          crop_id?: number | null
          id?: number
          region?: string | null
          season_window?: Database["public"]["Enums"]["season_window"] | null
          source: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          category?: Database["public"]["Enums"]["cost_category"]
          created_at?: string
          crop_id?: number | null
          id?: number
          region?: string | null
          season_window?: Database["public"]["Enums"]["season_window"] | null
          source?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v_crop_summary"
            referencedColumns: ["crop_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: number
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_method: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
        }
        Insert: {
          auth_method?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
        }
        Update: {
          auth_method?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
        }
        Relationships: []
      }
      season_costs: {
        Row: {
          amount_pesewas: number
          category: Database["public"]["Enums"]["cost_category"]
          client_id: string | null
          created_at: string
          date_incurred: string | null
          description: string | null
          id: number
          quantity: number | null
          season_id: number
          unit: string | null
          unit_cost_pesewas: number | null
          updated_at: string
        }
        Insert: {
          amount_pesewas: number
          category: Database["public"]["Enums"]["cost_category"]
          client_id?: string | null
          created_at?: string
          date_incurred?: string | null
          description?: string | null
          id?: number
          quantity?: number | null
          season_id: number
          unit?: string | null
          unit_cost_pesewas?: number | null
          updated_at?: string
        }
        Update: {
          amount_pesewas?: number
          category?: Database["public"]["Enums"]["cost_category"]
          client_id?: string | null
          created_at?: string
          date_incurred?: string | null
          description?: string | null
          id?: number
          quantity?: number | null
          season_id?: number
          unit?: string | null
          unit_cost_pesewas?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_costs_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          area_planted_acres: number
          client_id: string | null
          created_at: string
          crop_id: number
          farm_id: number
          harvest_qty: number | null
          harvest_unit: string | null
          id: number
          is_complete: boolean
          revenue_pesewas: number | null
          season_window: Database["public"]["Enums"]["season_window"]
          updated_at: string
          year: number
        }
        Insert: {
          area_planted_acres: number
          client_id?: string | null
          created_at?: string
          crop_id: number
          farm_id: number
          harvest_qty?: number | null
          harvest_unit?: string | null
          id?: number
          is_complete?: boolean
          revenue_pesewas?: number | null
          season_window: Database["public"]["Enums"]["season_window"]
          updated_at?: string
          year: number
        }
        Update: {
          area_planted_acres?: number
          client_id?: string | null
          created_at?: string
          crop_id?: number
          farm_id?: number
          harvest_qty?: number | null
          harvest_unit?: string | null
          id?: number
          is_complete?: boolean
          revenue_pesewas?: number | null
          season_window?: Database["public"]["Enums"]["season_window"]
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "seasons_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "crops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_crop_id_fkey"
            columns: ["crop_id"]
            isOneToOne: false
            referencedRelation: "v_crop_summary"
            referencedColumns: ["crop_id"]
          },
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v_farm_summary"
            referencedColumns: ["farm_id"]
          },
        ]
      }
    }
    Views: {
      v_category_budget_status: {
        Row: {
          category: Database["public"]["Enums"]["cost_category"] | null
          id: number | null
          is_over_budget: boolean | null
          limit_pesewas: number | null
          pct_used: number | null
          remaining_pesewas: number | null
          season_id: number | null
          spent_pesewas: number | null
        }
        Relationships: [
          {
            foreignKeyName: "category_budgets_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      v_crop_summary: {
        Row: {
          cost_per_acre_pesewas: number | null
          crop_id: number | null
          crop_name: string | null
          farm_id: number | null
          season_count: number | null
          total_acres: number | null
          total_recorded_pesewas: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v_farm_summary"
            referencedColumns: ["farm_id"]
          },
        ]
      }
      v_estimate_report: {
        Row: {
          advice: string | null
          area_acres: number | null
          benchmark_pesewas: number | null
          category: Database["public"]["Enums"]["cost_category"] | null
          created_at: string | null
          crop_name: string | null
          estimate_id: number | null
          estimated_pesewas: number | null
          farm_id: number | null
          farm_name: string | null
          is_actual: boolean | null
          is_flagged: boolean | null
          method: Database["public"]["Enums"]["estimate_method"] | null
          potential_saving_pesewas: number | null
          season_id: number | null
          season_window: Database["public"]["Enums"]["season_window"] | null
          seasons_used: number | null
          total_pesewas: number | null
          variance_pct: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "farms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_farm_id_fkey"
            columns: ["farm_id"]
            isOneToOne: false
            referencedRelation: "v_farm_summary"
            referencedColumns: ["farm_id"]
          },
        ]
      }
      v_farm_summary: {
        Row: {
          completed_seasons: number | null
          crop_count: number | null
          farm_id: number | null
          farm_name: string | null
          season_count: number | null
          total_area_acres: number | null
          total_estimated_pesewas: number | null
          total_planted_acres: number | null
          total_possible_saving_pesewas: number | null
          total_recorded_pesewas: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_my_account: { Args: never; Returns: undefined }
      generate_estimate: { Args: { p_season_id: number }; Returns: number }
      get_category_benchmark_pesewas: {
        Args: {
          p_category: Database["public"]["Enums"]["cost_category"]
          p_season_id: number
        }
        Returns: number
      }
      get_crop_benchmark_breakdown: {
        Args: {
          p_area_acres: number
          p_crop_id: number
          p_season_window: Database["public"]["Enums"]["season_window"]
        }
        Returns: {
          benchmark_pesewas: number
          category: Database["public"]["Enums"]["cost_category"]
        }[]
      }
      quick_fill_costs: { Args: { p_season_id: number }; Returns: undefined }
    }
    Enums: {
      cost_category:
        | "seeds"
        | "fertiliser"
        | "agrochem"
        | "land_prep"
        | "labour"
        | "transport"
        | "storage"
        | "other"
      estimate_method: "benchmark" | "blended" | "history"
      price_basis: "subsidised" | "open_market"
      season_window: "major" | "minor" | "dry"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      cost_category: [
        "seeds",
        "fertiliser",
        "agrochem",
        "land_prep",
        "labour",
        "transport",
        "storage",
        "other",
      ],
      estimate_method: ["benchmark", "blended", "history"],
      price_basis: ["subsidised", "open_market"],
      season_window: ["major", "minor", "dry"],
    },
  },
} as const

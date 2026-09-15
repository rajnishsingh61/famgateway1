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
      api_keys: {
        Row: {
          created_at: string
          id: string
          label: string
          public_key: string
          revoked: boolean
          secret_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          public_key: string
          revoked?: boolean
          secret_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          public_key?: string
          revoked?: boolean
          secret_key?: string
          user_id?: string
        }
        Relationships: []
      }
      merchant_settings: {
        Row: {
          app_password_enc: string | null
          connected: boolean
          created_at: string
          fampay_email: string | null
          last_error: string | null
          last_verified_at: string | null
          project_name: string | null
          recovery_email: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          app_password_enc?: string | null
          connected?: boolean
          created_at?: string
          fampay_email?: string | null
          last_error?: string | null
          last_verified_at?: string | null
          project_name?: string | null
          recovery_email?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          app_password_enc?: string | null
          connected?: boolean
          created_at?: string
          fampay_email?: string | null
          last_error?: string | null
          last_verified_at?: string | null
          project_name?: string | null
          recovery_email?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          created_at: string
          customer_email: string | null
          expires_at: string
          id: string
          note: string | null
          order_id: string
          paid_at: string | null
          payer_upi: string | null
          status: string
          user_id: string
          utr: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          customer_email?: string | null
          expires_at?: string
          id?: string
          note?: string | null
          order_id: string
          paid_at?: string | null
          payer_upi?: string | null
          status?: string
          user_id: string
          utr?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          customer_email?: string | null
          expires_at?: string
          id?: string
          note?: string | null
          order_id?: string
          paid_at?: string | null
          payer_upi?: string | null
          status?: string
          user_id?: string
          utr?: string | null
        }
        Relationships: []
      }
      passkey_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_label: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_label?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          payer_note: string | null
          plan: string
          reference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          upi_uri: string
          user_id: string
          utr: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          payer_note?: string | null
          plan: string
          reference: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          upi_uri: string
          user_id: string
          utr?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          payer_note?: string | null
          plan?: string
          reference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          upi_uri?: string
          user_id?: string
          utr?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          plan: string
          status: string
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          plan?: string
          status?: string
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          kind: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          amount: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          event: string | null
          id: string
          ok: boolean
          order_id: string | null
          payload: Json | null
          response_snippet: string | null
          status_code: number | null
          url: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string | null
          id?: string
          ok?: boolean
          order_id?: string | null
          payload?: Json | null
          response_snippet?: string | null
          status_code?: number | null
          url: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          event?: string | null
          id?: string
          ok?: boolean
          order_id?: string | null
          payload?: Json | null
          response_snippet?: string | null
          status_code?: number | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_subscriptions: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "merchant"
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
      app_role: ["admin", "merchant"],
    },
  },
} as const

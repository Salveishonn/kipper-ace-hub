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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          claim_number: string | null
          created_at: string
          description: string
          documents: Json | null
          id: string
          incident_date: string
          incident_location: string | null
          incident_time: string | null
          policy_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          claim_number?: string | null
          created_at?: string
          description: string
          documents?: Json | null
          id?: string
          incident_date: string
          incident_location?: string | null
          incident_time?: string | null
          policy_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          claim_number?: string | null
          created_at?: string
          description?: string
          documents?: Json | null
          id?: string
          incident_date?: string
          incident_location?: string | null
          incident_time?: string | null
          policy_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          opt_in: boolean | null
          origin: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          opt_in?: boolean | null
          origin?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          opt_in?: boolean | null
          origin?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          policy_id: string
          receipt_url: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          policy_id: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          policy_id?: string
          receipt_url?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "installments_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_productor_id: string | null
          coverage_type: string | null
          created_at: string
          dni: string | null
          documents: Json | null
          email: string
          full_name: string
          id: string
          locality: string | null
          notes: string | null
          origin: string | null
          phone: string | null
          postal_code: string | null
          status: string
          updated_at: string
          user_id: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_type: string | null
          vehicle_use: string | null
          vehicle_version: string | null
          vehicle_year: number | null
        }
        Insert: {
          assigned_productor_id?: string | null
          coverage_type?: string | null
          created_at?: string
          dni?: string | null
          documents?: Json | null
          email: string
          full_name: string
          id?: string
          locality?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_use?: string | null
          vehicle_version?: string | null
          vehicle_year?: number | null
        }
        Update: {
          assigned_productor_id?: string | null
          coverage_type?: string | null
          created_at?: string
          dni?: string | null
          documents?: Json | null
          email?: string
          full_name?: string
          id?: string
          locality?: string | null
          notes?: string | null
          origin?: string | null
          phone?: string | null
          postal_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_type?: string | null
          vehicle_use?: string | null
          vehicle_version?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          assigned_productor_id: string | null
          coverage_type: string | null
          created_at: string
          documents: Json | null
          end_date: string
          id: string
          insurance_company_id: string | null
          lead_id: string | null
          notes: string | null
          payment_frequency: string | null
          policy_number: string | null
          policy_type: string
          premium_amount: number | null
          start_date: string
          status: string
          updated_at: string
          user_id: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: number | null
        }
        Insert: {
          assigned_productor_id?: string | null
          coverage_type?: string | null
          created_at?: string
          documents?: Json | null
          end_date: string
          id?: string
          insurance_company_id?: string | null
          lead_id?: string | null
          notes?: string | null
          payment_frequency?: string | null
          policy_number?: string | null
          policy_type: string
          premium_amount?: number | null
          start_date: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Update: {
          assigned_productor_id?: string | null
          coverage_type?: string | null
          created_at?: string
          documents?: Json | null
          end_date?: string
          id?: string
          insurance_company_id?: string | null
          lead_id?: string | null
          notes?: string | null
          payment_frequency?: string | null
          policy_number?: string | null
          policy_type?: string
          premium_amount?: number | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          created_at: string
          dni: string | null
          email: string
          full_name: string | null
          id: string
          marketing_consent: boolean | null
          phone: string | null
          postal_code: string | null
          preferred_contact: string | null
          province: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          dni?: string | null
          email: string
          full_name?: string | null
          id?: string
          marketing_consent?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          dni?: string | null
          email?: string
          full_name?: string | null
          id?: string
          marketing_consent?: boolean | null
          phone?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          province?: string | null
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
      vehicle_brands: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      vehicle_models: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          name: string
          year_end: number | null
          year_start: number | null
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          name: string
          year_end?: number | null
          year_start?: number | null
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          name?: string
          year_end?: number | null
          year_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vehicle_brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_cliente: { Args: never; Returns: boolean }
      is_productor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "productor" | "cliente"
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

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "productor", "cliente"],
    },
  },
} as const

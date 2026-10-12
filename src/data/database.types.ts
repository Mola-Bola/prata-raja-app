export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          app_version: string | null
          author_id: string
          body: string
          created_at: string
          device: string | null
          id: string
          kind: Database["public"]["Enums"]["feedback_kind"]
          module: string
          params: Json
          parent_id: string | null
          plan: string | null
          platform: string | null
          priority: number | null
          route: string | null
          screen: string | null
          screenshot_path: string | null
          shipped_in: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          tags: string[]
          update_id: string | null
          updated_at: string
        }
        Insert: {
          app_version?: string | null
          author_id?: string
          body: string
          created_at?: string
          device?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["feedback_kind"]
          module?: string
          params?: Json
          parent_id?: string | null
          plan?: string | null
          platform?: string | null
          priority?: number | null
          route?: string | null
          screen?: string | null
          screenshot_path?: string | null
          shipped_in?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tags?: string[]
          update_id?: string | null
          updated_at?: string
        }
        Update: {
          app_version?: string | null
          author_id?: string
          body?: string
          created_at?: string
          device?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["feedback_kind"]
          module?: string
          params?: Json
          parent_id?: string | null
          plan?: string | null
          platform?: string | null
          priority?: number | null
          route?: string | null
          screen?: string | null
          screenshot_path?: string | null
          shipped_in?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          tags?: string[]
          update_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_messages: {
        Row: {
          author_id: string | null
          author_label: string
          body: string
          created_at: string
          feedback_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          author_label?: string
          body: string
          created_at?: string
          feedback_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          author_label?: string
          body?: string
          created_at?: string
          feedback_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_messages_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      ota_updates: {
        Row: {
          created_at: string
          id: string
          label: string
          manifest: Json
          platform: string
          runtime_version: string
        }
        Insert: {
          created_at?: string
          id: string
          label: string
          manifest: Json
          platform: string
          runtime_version: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          manifest?: Json
          platform?: string
          runtime_version?: string
        }
        Relationships: []
      }
      private_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          is_admin?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
        }
        Relationships: []
      }
      releases: {
        Row: {
          created_at: string
          feedback_ids: string[]
          id: string
          kind: string
          label: string
          notes: string
          runtime_version: string
        }
        Insert: {
          created_at?: string
          feedback_ids?: string[]
          id?: string
          kind: string
          label: string
          notes: string
          runtime_version: string
        }
        Update: {
          created_at?: string
          feedback_ids?: string[]
          id?: string
          kind?: string
          label?: string
          notes?: string
          runtime_version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      display_name_of: { Args: { u: string }; Returns: string }
      feedback_act: {
        Args: { p_action: string; p_id: string; p_note?: string }
        Returns: Database["public"]["Enums"]["feedback_status"]
      }
      feedback_stage: {
        Args: { s: Database["public"]["Enums"]["feedback_status"] }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_email: { Args: { p_email: string }; Returns: boolean }
      is_permanent: { Args: never; Returns: boolean }
    }
    Enums: {
      feedback_kind: "like" | "dislike" | "bug" | "idea" | "change"
      feedback_status:
        | "new"
        | "needs_info"
        | "proposed"
        | "approved"
        | "in_progress"
        | "shipped"
        | "done"
        | "wont_do"
        | "duplicate"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      feedback_kind: ["like", "dislike", "bug", "idea", "change"],
      feedback_status: [
        "new",
        "needs_info",
        "proposed",
        "approved",
        "in_progress",
        "shipped",
        "done",
        "wont_do",
        "duplicate",
      ],
    },
  },
} as const


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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_insights: {
        Row: {
          content: string
          created_at: string
          id: string
          insight_type: string
          last_processed_word_count: number | null
          search_vector: unknown | null
          session_id: string
          session_status: string | null
          timestamp_seconds: number | null
          transcript_segment_id: string | null
          transcript_version: number | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          insight_type: string
          last_processed_word_count?: number | null
          search_vector?: unknown | null
          session_id: string
          session_status?: string | null
          timestamp_seconds?: number | null
          transcript_segment_id?: string | null
          transcript_version?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          insight_type?: string
          last_processed_word_count?: number | null
          search_vector?: unknown | null
          session_id?: string
          session_status?: string | null
          timestamp_seconds?: number | null
          transcript_segment_id?: string | null
          transcript_version?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_insights_transcript_segment_id_fkey"
            columns: ["transcript_segment_id"]
            isOneToOne: false
            referencedRelation: "transcript_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      conferences: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
          organization_id: string
          search_vector: unknown | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
          organization_id: string
          search_vector?: unknown | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
          organization_id?: string
          search_vector?: unknown | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
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
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string
          id: string
          is_answered: boolean | null
          question: string
          session_id: string
          upvotes: number | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean | null
          question: string
          session_id: string
          upvotes?: number | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string
          id?: string
          is_answered?: boolean | null
          question?: string
          session_id?: string
          upvotes?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_settings: {
        Row: {
          audio_quality: string | null
          auto_speaker_detection: boolean | null
          created_at: string | null
          id: string
          selected_device_id: string | null
          session_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audio_quality?: string | null
          auto_speaker_detection?: boolean | null
          created_at?: string | null
          id?: string
          selected_device_id?: string | null
          session_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audio_quality?: string | null
          auto_speaker_detection?: boolean | null
          created_at?: string | null
          id?: string
          selected_device_id?: string | null
          session_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_settings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          email_alerts: boolean | null
          filters: Json | null
          id: string
          name: string
          query: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_alerts?: boolean | null
          filters?: Json | null
          id?: string
          name: string
          query: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_alerts?: boolean | null
          filters?: Json | null
          id?: string
          name?: string
          query?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_attendees: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          left_at: string | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          left_at?: string | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_attendees_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          is_public: boolean | null
          is_recording: boolean | null
          qr_code_url: string | null
          recording_url: string | null
          search_vector: unknown | null
          speaker_bio: string | null
          speaker_email: string | null
          speaker_name: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          title: string
          track_id: string
          transcription_provider: string | null
          transcription_settings: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_public?: boolean | null
          is_recording?: boolean | null
          qr_code_url?: string | null
          recording_url?: string | null
          search_vector?: unknown | null
          speaker_bio?: string | null
          speaker_email?: string | null
          speaker_name?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          title: string
          track_id: string
          transcription_provider?: string | null
          transcription_settings?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_public?: boolean | null
          is_recording?: boolean | null
          qr_code_url?: string | null
          recording_url?: string | null
          search_vector?: unknown | null
          speaker_bio?: string | null
          speaker_email?: string | null
          speaker_name?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          title?: string
          track_id?: string
          transcription_provider?: string | null
          transcription_settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          conference_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          conference_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          conference_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracks_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      transcript_segments: {
        Row: {
          confidence: number | null
          created_at: string
          end_time: number | null
          id: string
          search_vector: unknown | null
          session_id: string
          speaker_id: string | null
          speaker_label: string | null
          speaker_name: string | null
          start_time: number | null
          text: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          end_time?: number | null
          id?: string
          search_vector?: unknown | null
          session_id: string
          speaker_id?: string | null
          speaker_label?: string | null
          speaker_name?: string | null
          start_time?: number | null
          text: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          end_time?: number | null
          id?: string
          search_vector?: unknown | null
          session_id?: string
          speaker_id?: string | null
          speaker_label?: string | null
          speaker_name?: string | null
          start_time?: number | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcript_segments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
      has_org_access: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "attendee"
      notification_type:
        | "session_starting"
        | "question_asked"
        | "session_ended"
        | "new_insight"
        | "question_upvoted"
      session_status: "draft" | "scheduled" | "live" | "completed" | "cancelled"
      transcription_provider: "browser" | "whisper"
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
      app_role: ["admin", "organizer", "attendee"],
      notification_type: [
        "session_starting",
        "question_asked",
        "session_ended",
        "new_insight",
        "question_upvoted",
      ],
      session_status: ["draft", "scheduled", "live", "completed", "cancelled"],
      transcription_provider: ["browser", "whisper"],
    },
  },
} as const

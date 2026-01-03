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
      audit_log: {
        Row: {
          action: string
          case_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          case_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          child_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          school_year: string | null
          status: string
          updated_at: string
        }
        Insert: {
          child_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          school_year?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          child_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          school_year?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          disability_categories: string[] | null
          district: string | null
          grade: string | null
          id: string
          name: string
          school: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_categories?: string[] | null
          district?: string | null
          grade?: string | null
          id?: string
          name: string
          school?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          disability_categories?: string[] | null
          district?: string | null
          grade?: string | null
          id?: string
          name?: string
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      citations: {
        Row: {
          bbox: Json | null
          created_at: string
          document_id: string
          finding_id: string
          id: string
          page_number: number
          quote_text: string
          quote_text_normalized: string | null
          verification_method: string | null
          verification_score: number | null
          verification_status: Database["public"]["Enums"]["verification_status"]
          verified_at: string | null
        }
        Insert: {
          bbox?: Json | null
          created_at?: string
          document_id: string
          finding_id: string
          id?: string
          page_number: number
          quote_text: string
          quote_text_normalized?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Update: {
          bbox?: Json | null
          created_at?: string
          document_id?: string
          finding_id?: string
          id?: string
          page_number?: number
          quote_text?: string
          quote_text_normalized?: string | null
          verification_method?: string | null
          verification_score?: number | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "citations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "findings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_blocks: {
        Row: {
          bbox: Json | null
          block_type: string
          confidence: number | null
          created_at: string
          document_id: string
          id: string
          page_number: number
          parent_block_id: string | null
          reading_order: number | null
          text: string
          text_normalized: string | null
        }
        Insert: {
          bbox?: Json | null
          block_type: string
          confidence?: number | null
          created_at?: string
          document_id: string
          id?: string
          page_number: number
          parent_block_id?: string | null
          reading_order?: number | null
          text: string
          text_normalized?: string | null
        }
        Update: {
          bbox?: Json | null
          block_type?: string
          confidence?: number | null
          created_at?: string
          document_id?: string
          id?: string
          page_number?: number
          parent_block_id?: string | null
          reading_order?: number | null
          text?: string
          text_normalized?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_blocks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_blocks_parent_block_id_fkey"
            columns: ["parent_block_id"]
            isOneToOne: false
            referencedRelation: "document_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      document_pages: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          id: string
          image_height: number | null
          image_storage_path: string | null
          image_width: number | null
          page_number: number
          text: string
          text_normalized: string | null
          word_count: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          id?: string
          image_height?: number | null
          image_storage_path?: string | null
          image_width?: number | null
          page_number: number
          text: string
          text_normalized?: string | null
          word_count?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          id?: string
          image_height?: number | null
          image_storage_path?: string | null
          image_width?: number | null
          page_number?: number
          text?: string
          text_normalized?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_pages_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          created_at: string
          deleted_at: string | null
          effective_date: string | null
          error_details: Json | null
          error_message: string | null
          extraction_completed_at: string | null
          extraction_started_at: string | null
          extractor: string
          extractor_version: string | null
          file_size_bytes: number | null
          id: string
          is_partial_extraction: boolean
          meeting_date: string | null
          mime_type: string
          page_count: number | null
          retry_count: number
          source_filename: string
          status: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          error_details?: Json | null
          error_message?: string | null
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extractor?: string
          extractor_version?: string | null
          file_size_bytes?: number | null
          id?: string
          is_partial_extraction?: boolean
          meeting_date?: string | null
          mime_type?: string
          page_count?: number | null
          retry_count?: number
          source_filename: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          effective_date?: string | null
          error_details?: Json | null
          error_message?: string | null
          extraction_completed_at?: string | null
          extraction_started_at?: string | null
          extractor?: string
          extractor_version?: string | null
          file_size_bytes?: number | null
          id?: string
          is_partial_extraction?: boolean
          meeting_date?: string | null
          mime_type?: string
          page_count?: number | null
          retry_count?: number
          source_filename?: string
          status?: Database["public"]["Enums"]["document_status"]
          storage_path?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: string[] | null
          case_id: string
          created_at: string
          deleted_at: string | null
          duration_minutes: number | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          notes: string | null
          recap_document_id: string | null
          recap_status: string | null
          reminder_sent_at: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          attendees?: string[] | null
          case_id: string
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          recap_document_id?: string | null
          recap_status?: string | null
          reminder_sent_at?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          attendees?: string[] | null
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          recap_document_id?: string | null
          recap_status?: string | null
          reminder_sent_at?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_recap_document_id_fkey"
            columns: ["recap_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_iep_data: {
        Row: {
          created_at: string
          data: Json
          document_id: string
          extracted_at: string
          extraction_prompt_version: string | null
          id: string
          model_used: string
          reviewed_at: string | null
          reviewed_by: string | null
          schema_version: string
          search_vector: unknown
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: Json
          document_id: string
          extracted_at?: string
          extraction_prompt_version?: string | null
          id?: string
          model_used: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: string
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          document_id?: string
          extracted_at?: string
          extraction_prompt_version?: string | null
          id?: string
          model_used?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          schema_version?: string
          search_vector?: unknown
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extracted_iep_data_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          case_id: string
          category: Database["public"]["Enums"]["finding_category"]
          confidence: number | null
          created_at: string
          created_by: string
          deleted_at: string | null
          document_id: string
          id: string
          model_version: string | null
          needs_review_reason: string | null
          questions_to_ask: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          case_id: string
          category?: Database["public"]["Enums"]["finding_category"]
          confidence?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          document_id: string
          id?: string
          model_version?: string | null
          needs_review_reason?: string | null
          questions_to_ask?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary: string
          title: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          case_id?: string
          category?: Database["public"]["Enums"]["finding_category"]
          confidence?: number | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          document_id?: string
          id?: string
          model_version?: string | null
          needs_review_reason?: string | null
          questions_to_ask?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          body: string | null
          case_id: string
          created_at: string
          deleted_at: string | null
          drafted_at: string
          due_date: string | null
          generated_document_id: string | null
          id: string
          notes: string | null
          related_finding_ids: string[]
          response_received_at: string | null
          sent_at: string | null
          sent_via: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          case_id: string
          created_at?: string
          deleted_at?: string | null
          drafted_at?: string
          due_date?: string | null
          generated_document_id?: string | null
          id?: string
          notes?: string | null
          related_finding_ids?: string[]
          response_received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          case_id?: string
          created_at?: string
          deleted_at?: string | null
          drafted_at?: string
          due_date?: string | null
          generated_document_id?: string | null
          id?: string
          notes?: string | null
          related_finding_ids?: string[]
          response_received_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_generated_document_id_fkey"
            columns: ["generated_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      validation_issues: {
        Row: {
          category: string
          created_at: string
          dismissal_reason: string | null
          dismissed_at: string | null
          dismissed_by: string | null
          extracted_iep_data_id: string
          field_path: string | null
          id: string
          message: string
          severity: string
          status: string
          title: string
          updated_at: string
          validator_name: string
          validator_version: string
        }
        Insert: {
          category: string
          created_at?: string
          dismissal_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          extracted_iep_data_id: string
          field_path?: string | null
          id?: string
          message: string
          severity: string
          status?: string
          title: string
          updated_at?: string
          validator_name: string
          validator_version?: string
        }
        Update: {
          category?: string
          created_at?: string
          dismissal_reason?: string | null
          dismissed_at?: string | null
          dismissed_by?: string | null
          extracted_iep_data_id?: string
          field_path?: string | null
          id?: string
          message?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
          validator_name?: string
          validator_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_issues_extracted_iep_data_id_fkey"
            columns: ["extracted_iep_data_id"]
            isOneToOne: false
            referencedRelation: "extracted_iep_data"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_owns_case: { Args: { p_case_id: string }; Returns: boolean }
      user_owns_document: { Args: { p_document_id: string }; Returns: boolean }
    }
    Enums: {
      document_status:
        | "uploaded"
        | "processing"
        | "extracted"
        | "analyzing"
        | "complete"
        | "analysis_failed"
        | "failed"
      document_type:
        | "iep"
        | "evaluation"
        | "progress_report"
        | "email"
        | "meeting_notes"
        | "prior_written_notice"
        | "other"
      finding_category:
        | "services"
        | "goals"
        | "accommodations"
        | "baseline"
        | "placement"
        | "procedural"
        | "timeline"
        | "other"
      verification_status: "pending" | "verified" | "failed" | "skipped"
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
      document_status: [
        "uploaded",
        "processing",
        "extracted",
        "analyzing",
        "complete",
        "analysis_failed",
        "failed",
      ],
      document_type: [
        "iep",
        "evaluation",
        "progress_report",
        "email",
        "meeting_notes",
        "prior_written_notice",
        "other",
      ],
      finding_category: [
        "services",
        "goals",
        "accommodations",
        "baseline",
        "placement",
        "procedural",
        "timeline",
        "other",
      ],
      verification_status: ["pending", "verified", "failed", "skipped"],
    },
  },
} as const

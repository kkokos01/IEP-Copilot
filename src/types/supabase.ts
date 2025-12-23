export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      children: {
        Row: {
          id: string
          user_id: string
          name: string
          date_of_birth: string | null
          district: string | null
          school: string | null
          grade: string | null
          disability_categories: string[] | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          date_of_birth?: string | null
          district?: string | null
          school?: string | null
          grade?: string | null
          disability_categories?: string[] | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          date_of_birth?: string | null
          district?: string | null
          school?: string | null
          grade?: string | null
          disability_categories?: string[] | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      cases: {
        Row: {
          id: string
          child_id: string
          name: string
          school_year: string | null
          status: 'active' | 'archived'
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          child_id: string
          name: string
          school_year?: string | null
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          child_id?: string
          name?: string
          school_year?: string | null
          status?: 'active' | 'archived'
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          case_id: string
          type: 'iep' | 'evaluation' | 'progress_report' | 'email' | 'meeting_notes' | 'prior_written_notice' | 'other'
          source_filename: string
          storage_path: string
          mime_type: string
          file_size_bytes: number | null
          effective_date: string | null
          meeting_date: string | null
          status: 'uploaded' | 'processing' | 'extracted' | 'analyzing' | 'complete' | 'analysis_failed' | 'failed'
          page_count: number | null
          extractor: string
          extractor_version: string | null
          extraction_started_at: string | null
          extraction_completed_at: string | null
          error_message: string | null
          error_details: Json | null
          retry_count: number
          is_partial_extraction: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          type?: 'iep' | 'evaluation' | 'progress_report' | 'email' | 'meeting_notes' | 'prior_written_notice' | 'other'
          source_filename: string
          storage_path: string
          mime_type?: string
          file_size_bytes?: number | null
          effective_date?: string | null
          meeting_date?: string | null
          status?: 'uploaded' | 'processing' | 'extracted' | 'analyzing' | 'complete' | 'analysis_failed' | 'failed'
          page_count?: number | null
          extractor?: string
          extractor_version?: string | null
          extraction_started_at?: string | null
          extraction_completed_at?: string | null
          error_message?: string | null
          error_details?: Json | null
          retry_count?: number
          is_partial_extraction?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          type?: 'iep' | 'evaluation' | 'progress_report' | 'email' | 'meeting_notes' | 'prior_written_notice' | 'other'
          source_filename?: string
          storage_path?: string
          mime_type?: string
          file_size_bytes?: number | null
          effective_date?: string | null
          meeting_date?: string | null
          status?: 'uploaded' | 'processing' | 'extracted' | 'analyzing' | 'complete' | 'analysis_failed' | 'failed'
          page_count?: number | null
          extractor?: string
          extractor_version?: string | null
          extraction_started_at?: string | null
          extraction_completed_at?: string | null
          error_message?: string | null
          error_details?: Json | null
          retry_count?: number
          is_partial_extraction?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      document_pages: {
        Row: {
          id: string
          document_id: string
          page_number: number
          text: string
          text_normalized: string | null
          word_count: number | null
          image_storage_path: string | null
          image_width: number | null
          image_height: number | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          page_number: number
          text: string
          text_normalized?: string | null
          word_count?: number | null
          image_storage_path?: string | null
          image_width?: number | null
          image_height?: number | null
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          page_number?: number
          text?: string
          text_normalized?: string | null
          word_count?: number | null
          image_storage_path?: string | null
          image_width?: number | null
          image_height?: number | null
          confidence?: number | null
          created_at?: string
        }
      }
      document_blocks: {
        Row: {
          id: string
          document_id: string
          page_number: number
          block_type: 'paragraph' | 'heading' | 'list_item' | 'table' | 'table_cell' | 'header' | 'footer' | 'page_number' | 'other'
          text: string
          text_normalized: string | null
          bbox: Json | null
          reading_order: number | null
          parent_block_id: string | null
          confidence: number | null
          created_at: string
        }
        Insert: {
          id?: string
          document_id: string
          page_number: number
          block_type: 'paragraph' | 'heading' | 'list_item' | 'table' | 'table_cell' | 'header' | 'footer' | 'page_number' | 'other'
          text: string
          text_normalized?: string | null
          bbox?: Json | null
          reading_order?: number | null
          parent_block_id?: string | null
          confidence?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          page_number?: number
          block_type?: 'paragraph' | 'heading' | 'list_item' | 'table' | 'table_cell' | 'header' | 'footer' | 'page_number' | 'other'
          text?: string
          text_normalized?: string | null
          bbox?: Json | null
          reading_order?: number | null
          parent_block_id?: string | null
          confidence?: number | null
          created_at?: string
        }
      }
      findings: {
        Row: {
          id: string
          document_id: string
          case_id: string
          created_by: 'ai' | 'user'
          status: 'active' | 'needs_review' | 'dismissed' | 'addressed'
          category: 'services' | 'goals' | 'accommodations' | 'baseline' | 'placement' | 'procedural' | 'timeline' | 'other'
          title: string
          summary: string
          why_it_matters: string | null
          questions_to_ask: string[]
          confidence: number | null
          model_version: string | null
          needs_review_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          document_id: string
          case_id: string
          created_by?: 'ai' | 'user'
          status?: 'active' | 'needs_review' | 'dismissed' | 'addressed'
          category?: 'services' | 'goals' | 'accommodations' | 'baseline' | 'placement' | 'procedural' | 'timeline' | 'other'
          title: string
          summary: string
          why_it_matters?: string | null
          questions_to_ask?: string[]
          confidence?: number | null
          model_version?: string | null
          needs_review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          document_id?: string
          case_id?: string
          created_by?: 'ai' | 'user'
          status?: 'active' | 'needs_review' | 'dismissed' | 'addressed'
          category?: 'services' | 'goals' | 'accommodations' | 'baseline' | 'placement' | 'procedural' | 'timeline' | 'other'
          title?: string
          summary?: string
          why_it_matters?: string | null
          questions_to_ask?: string[]
          confidence?: number | null
          model_version?: string | null
          needs_review_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      citations: {
        Row: {
          id: string
          finding_id: string
          document_id: string
          page_number: number
          quote_text: string
          quote_text_normalized: string | null
          bbox: Json | null
          verification_status: 'pending' | 'verified' | 'failed' | 'skipped'
          verification_score: number | null
          verified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          finding_id: string
          document_id: string
          page_number: number
          quote_text: string
          quote_text_normalized?: string | null
          bbox?: Json | null
          verification_status?: 'pending' | 'verified' | 'failed' | 'skipped'
          verification_score?: number | null
          verified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          finding_id?: string
          document_id?: string
          page_number?: number
          quote_text?: string
          quote_text_normalized?: string | null
          bbox?: Json | null
          verification_status?: 'pending' | 'verified' | 'failed' | 'skipped'
          verification_score?: number | null
          verified_at?: string | null
          created_at?: string
        }
      }
      requests: {
        Row: {
          id: string
          case_id: string
          type: 'initial_evaluation' | 'reevaluation' | 'independent_evaluation' | 'progress_data' | 'meeting_request' | 'written_explanation' | 'records_request' | 'other'
          status: 'draft' | 'ready' | 'sent' | 'awaiting_response' | 'responded' | 'escalated' | 'closed'
          drafted_at: string
          sent_at: string | null
          sent_via: 'email' | 'mail' | 'hand_delivered' | 'other' | null
          due_date: string | null
          response_received_at: string | null
          subject: string | null
          body: string | null
          generated_document_id: string | null
          related_finding_ids: string[]
          notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          type: 'initial_evaluation' | 'reevaluation' | 'independent_evaluation' | 'progress_data' | 'meeting_request' | 'written_explanation' | 'records_request' | 'other'
          status?: 'draft' | 'ready' | 'sent' | 'awaiting_response' | 'responded' | 'escalated' | 'closed'
          drafted_at?: string
          sent_at?: string | null
          sent_via?: 'email' | 'mail' | 'hand_delivered' | 'other' | null
          due_date?: string | null
          response_received_at?: string | null
          subject?: string | null
          body?: string | null
          generated_document_id?: string | null
          related_finding_ids?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          type?: 'initial_evaluation' | 'reevaluation' | 'independent_evaluation' | 'progress_data' | 'meeting_request' | 'written_explanation' | 'records_request' | 'other'
          status?: 'draft' | 'ready' | 'sent' | 'awaiting_response' | 'responded' | 'escalated' | 'closed'
          drafted_at?: string
          sent_at?: string | null
          sent_via?: 'email' | 'mail' | 'hand_delivered' | 'other' | null
          due_date?: string | null
          response_received_at?: string | null
          subject?: string | null
          body?: string | null
          generated_document_id?: string | null
          related_finding_ids?: string[]
          notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      events: {
        Row: {
          id: string
          case_id: string
          type: 'iep_meeting' | 'eligibility_meeting' | 'manifestation_meeting' | 'phone_call' | 'email' | 'deadline' | 'other'
          event_date: string
          event_time: string | null
          duration_minutes: number | null
          title: string
          location: string | null
          attendees: string[] | null
          notes: string | null
          recap_document_id: string | null
          recap_status: 'pending' | 'draft' | 'sent' | null
          reminder_sent_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          type: 'iep_meeting' | 'eligibility_meeting' | 'manifestation_meeting' | 'phone_call' | 'email' | 'deadline' | 'other'
          event_date: string
          event_time?: string | null
          duration_minutes?: number | null
          title: string
          location?: string | null
          attendees?: string[] | null
          notes?: string | null
          recap_document_id?: string | null
          recap_status?: 'pending' | 'draft' | 'sent' | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          type?: 'iep_meeting' | 'eligibility_meeting' | 'manifestation_meeting' | 'phone_call' | 'email' | 'deadline' | 'other'
          event_date?: string
          event_time?: string | null
          duration_minutes?: number | null
          title?: string
          location?: string | null
          attendees?: string[] | null
          notes?: string | null
          recap_document_id?: string | null
          recap_status?: 'pending' | 'draft' | 'sent' | null
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          entity_type: string
          entity_id: string | null
          case_id: string | null
          action: string
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          entity_type: string
          entity_id?: string | null
          case_id?: string | null
          action: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          entity_type?: string
          entity_id?: string | null
          case_id?: string | null
          action?: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_type: 'iep' | 'evaluation' | 'progress_report' | 'email' | 'meeting_notes' | 'prior_written_notice' | 'other'
      document_status: 'uploaded' | 'processing' | 'extracted' | 'analyzing' | 'complete' | 'analysis_failed' | 'failed'
      finding_category: 'services' | 'goals' | 'accommodations' | 'baseline' | 'placement' | 'procedural' | 'timeline' | 'other'
      verification_status: 'pending' | 'verified' | 'failed' | 'skipped'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

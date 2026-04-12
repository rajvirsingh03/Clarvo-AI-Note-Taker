// Supabase TypeScript type file for database schema.
// Auto-updated for Razorpay billing integration.

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          billing_tier: 'FREE' | 'PRO' | 'POWER' | 'STUDENT'
          free_minutes_used: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          razorpay_subscription_id: string | null
          razorpay_customer_id: string | null
          subscription_status: string
          subscription_plan_id: string | null
          subscription_interval: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean
          monthly_hours_limit: number
          notion_access_token: string | null
          notion_workspace_id: string | null
          notion_workspace_name: string | null
          notion_database_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          billing_tier?: 'FREE' | 'PRO' | 'POWER' | 'STUDENT'
          free_minutes_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          subscription_status?: string
          subscription_plan_id?: string | null
          subscription_interval?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          monthly_hours_limit?: number
          notion_access_token?: string | null
          notion_workspace_id?: string | null
          notion_workspace_name?: string | null
          notion_database_id?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          billing_tier?: 'FREE' | 'PRO' | 'POWER' | 'STUDENT'
          free_minutes_used?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          razorpay_subscription_id?: string | null
          razorpay_customer_id?: string | null
          subscription_status?: string
          subscription_plan_id?: string | null
          subscription_interval?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean
          monthly_hours_limit?: number
          notion_access_token?: string | null
          notion_workspace_id?: string | null
          notion_workspace_name?: string | null
          notion_database_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          id: string
          tier: string
          name: string
          description: string | null
          razorpay_plan_id: string
          price_inr: number
          interval: 'monthly' | 'yearly'
          hours_per_month: number
          features: string[]
          is_student_only: boolean
          badge: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tier: string
          name: string
          description?: string | null
          razorpay_plan_id: string
          price_inr: number
          interval: 'monthly' | 'yearly'
          hours_per_month: number
          features?: string[]
          is_student_only?: boolean
          badge?: string | null
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          tier?: string
          name?: string
          description?: string | null
          razorpay_plan_id?: string
          price_inr?: number
          interval?: 'monthly' | 'yearly'
          hours_per_month?: number
          features?: string[]
          is_student_only?: boolean
          badge?: string | null
          sort_order?: number
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      subscription_events: {
        Row: {
          id: string
          event_id: string
          event_type: string
          subscription_id: string | null
          payment_id: string | null
          user_id: string | null
          payload: Record<string, unknown> | null
          processed_at: string
        }
        Insert: {
          id?: string
          event_id: string
          event_type: string
          subscription_id?: string | null
          payment_id?: string | null
          user_id?: string | null
          payload?: Record<string, unknown> | null
        }
        Update: {
          event_id?: string
          event_type?: string
          subscription_id?: string | null
          payment_id?: string | null
          user_id?: string | null
          payload?: Record<string, unknown> | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          title: string
          notes: string
          state: 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'POST_PROCESSING'
          duration_seconds: number
          watch_time_seconds: number
          notion_page_id: string | null
          video_url: string | null
          video_title: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          notes?: string
          state?: 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'POST_PROCESSING'
          duration_seconds?: number
          watch_time_seconds?: number
          notion_page_id?: string | null
          video_url?: string | null
          video_title?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          notes?: string
          state?: 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'POST_PROCESSING'
          duration_seconds?: number
          watch_time_seconds?: number
          notion_page_id?: string | null
          video_url?: string | null
          video_title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_user_id_fkey'
            columns: ['user_id']
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      session_chunks: {
        Row: {
          id: string
          session_id: string
          transcript: string
          chunk_index: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          transcript: string
          chunk_index: number
        }
        Update: {
          id?: string
          session_id?: string
          transcript?: string
          chunk_index?: number
        }
        Relationships: [
          {
            foreignKeyName: 'session_chunks_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      flashcards: {
        Row: {
          id: string
          session_id: string
          front: string
          back: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          front: string
          back: string
        }
        Update: {
          id?: string
          session_id?: string
          front?: string
          back?: string
        }
        Relationships: [
          {
            foreignKeyName: 'flashcards_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      screenshots: {
        Row: {
          id: string
          session_id: string
          data_url: string
          analysis: string | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          data_url: string
          analysis?: string | null
        }
        Update: {
          id?: string
          session_id?: string
          data_url?: string
          analysis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'screenshots_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      action_plans: {
        Row: {
          id: string
          session_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          content: string
        }
        Update: {
          id?: string
          session_id?: string
          content?: string
        }
        Relationships: [
          {
            foreignKeyName: 'action_plans_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          session_id: string
          question_number: number
          difficulty: number
          question: string
          options: string[]
          correct_answer_index: number
          explanation: string
          user_answer_index: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_number: number
          difficulty: number
          question: string
          options: string[]
          correct_answer_index: number
          explanation: string
          user_answer_index?: number | null
        }
        Update: {
          id?: string
          session_id?: string
          question_number?: number
          difficulty?: number
          question?: string
          options?: string[]
          correct_answer_index?: number
          explanation?: string
          user_answer_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: 'quiz_questions_session_id_fkey'
            columns: ['session_id']
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_free_minutes: {
        Args: {
          p_user_id: string
          p_minutes: number
        }
        Returns: undefined
      }
    }
    Enums: {
      billing_tier: 'FREE' | 'PRO' | 'POWER' | 'STUDENT'
      session_state: 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'POST_PROCESSING'
    }
    CompositeTypes: Record<string, never>
  }
}

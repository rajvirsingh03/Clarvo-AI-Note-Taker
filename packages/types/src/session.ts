/** Session state machine states */
export type SessionState = 'RECORDING' | 'PAUSED' | 'COMPLETED' | 'POST_PROCESSING'

export interface Session {
  id: string
  user_id: string
  title: string | null
  video_url: string | null
  video_title: string | null
  notes: string | null
  state: SessionState
  duration_seconds: number | null
  watch_time_seconds: number | null
  notion_page_id: string | null
  created_at: string
  updated_at: string
}

export interface SessionChunk {
  id: string
  session_id: string
  transcript: string
  extracted_notes: string | null
  chunk_index: number
  created_at: string
}

export interface Screenshot {
  id: string
  session_id: string
  storage_path: string
  caption: string | null
  inserted_at_chunk: number | null
  created_at: string
}

export interface ActionPlanRecord {
  id: string
  session_id: string
  content: string
  created_at: string
}

export interface SessionWithRelations extends Session {
  flashcards: Flashcard[]
  screenshots: Screenshot[]
  action_plans: ActionPlanRecord[]
}

// Import from ai.ts to avoid circular deps
import type { Flashcard } from './ai'

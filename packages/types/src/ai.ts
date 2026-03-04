/** A single flashcard */
export interface Flashcard {
  id?: string
  session_id?: string
  front: string
  back: string
  created_at?: string
}

/** An action plan item (verb-first, with rationale) */
export interface ActionPlanItem {
  action: string   // Verb-first imperative e.g. "Implement X"
  why: string      // Context/rationale
  completed?: boolean
}

export interface ActionPlan {
  items: ActionPlanItem[]
  rawMarkdown: string
}

/** AI pipeline request/response shapes */
export interface ExtractConceptsRequest {
  sessionId: string
  chunk: string
  existingNotesTail?: string
}

export interface ExtractConceptsResponse {
  success: boolean
  extractedNotes: string
}

export interface GenerateFlashcardsRequest {
  sessionId: string
}

export interface GenerateFlashcardsResponse {
  success: boolean
  flashcards: Flashcard[]
}

export interface GenerateActionPlanRequest {
  sessionId: string
}

export interface GenerateActionPlanResponse {
  success: boolean
  actionPlan: string
}

export interface AnalyzeScreenshotRequest {
  sessionId: string
  imageDataUrl: string
  audioContext?: string
}

export interface AnalyzeScreenshotResponse {
  success: boolean
  caption: string
}

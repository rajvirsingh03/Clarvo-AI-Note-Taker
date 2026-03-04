import type { Flashcard } from './ai'

export interface NotionExportPayload {
  sessionId: string
  title: string
  notes: string
  flashcards: Flashcard[]
  screenshotCaptions: Array<{ caption: string; storagePath: string }>
  createdAt: string
}

/** Subset of Notion API block types we generate */
export type NotionBlockType =
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'paragraph'
  | 'bulleted_list_item'
  | 'numbered_list_item'
  | 'callout'
  | 'equation'
  | 'image'
  | 'divider'
  | 'to_do'
  | 'toggle'

export interface NotionBlock {
  type: NotionBlockType
  [key: string]: unknown
}

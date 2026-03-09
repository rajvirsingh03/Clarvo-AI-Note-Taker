import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
]

/**
 * Get the primary Gemini 2.5 Flash-Lite model for text tasks
 */
export function getGeminiPro() {
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-lite',
    safetySettings: SAFETY_SETTINGS,
  })
}

/**
 * Extract concepts from a transcript chunk.
 * Returns structured Markdown with KaTeX math blocks.
 */
export async function extractConcepts(
  chunk: string,
  existingNotesTail: string
): Promise<string> {
  const model = getGeminiPro()
  const { buildConceptExtractionPrompt } = await import('@clarvo/utils')

  const prompt = buildConceptExtractionPrompt(chunk, existingNotesTail)
  const result = await model.generateContent(prompt)
  return result.response.text()
}

/**
 * Generate flashcards from session notes.
 * Returns a JSON array of { front, back } objects.
 */
export async function generateFlashcards(notes: string): Promise<Array<{ front: string; back: string }>> {
  const model = getGeminiPro()
  const { buildFlashcardPrompt } = await import('@clarvo/utils')

  const prompt = buildFlashcardPrompt(notes)
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' },
  })

  const raw = result.response.text()
  return JSON.parse(raw) as Array<{ front: string; back: string }>
}

/**
 * Generate an action plan from session notes.
 * Returns structured Markdown checklist.
 */
export async function generateActionPlan(notes: string): Promise<string> {
  const model = getGeminiPro()
  const { buildActionPlanPrompt } = await import('@clarvo/utils')

  const prompt = buildActionPlanPrompt(notes)
  const result = await model.generateContent(prompt)
  return result.response.text()
}



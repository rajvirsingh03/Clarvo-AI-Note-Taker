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

export interface QuizQuestion {
  id: number
  difficulty: number
  question: string
  options: string[]
  correct_answer_index: number
  explanation: string
}

/**
 * Extract image URLs referenced inside notes HTML (Supabase storage URLs).
 * Only returns absolute https:// URLs; skips base64 data URLs.
 */
function extractImageUrls(notesHtml: string): string[] {
  const matches = notesHtml.matchAll(/src="(https:\/\/[^"]+)"/g)
  const urls: string[] = []
  for (const m of matches) {
    if (m[1]) urls.push(m[1])
  }
  return urls
}

/**
 * Fetch a remote image URL and return it as a base64 inline data part.
 */
async function fetchImagePart(url: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const mimeType = contentType.split(';')[0]?.trim() ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()
    const data = Buffer.from(buffer).toString('base64')
    return { inlineData: { mimeType, data } }
  } catch {
    return null
  }
}

/**
 * Generate an MCQ quiz from session notes + optional screenshot images.
 * Returns a JSON array of QuizQuestion objects.
 */
export async function generateQuiz(
  notes: string,
  notesHtml: string
): Promise<QuizQuestion[]> {
  const { buildQuizPrompt, quizQuestionCount } = await import('@clarvo/utils')
  const numQuestions = quizQuestionCount(notes)

  // Collect image parts from embedded screenshot URLs (up to 5 images to stay within token limits)
  const imageUrls = extractImageUrls(notesHtml).slice(0, 5)
  const imageParts = (
    await Promise.all(imageUrls.map(fetchImagePart))
  ).filter((p): p is NonNullable<typeof p> => p !== null)

  const hasScreenshots = imageParts.length > 0
  const promptText = buildQuizPrompt(notes, numQuestions, hasScreenshots)

  const model = getGeminiPro()

  const contents = [
    { role: 'user' as const, parts: [
      { text: promptText },
      ...imageParts,
    ]},
  ]

  const result = await model.generateContent({
    contents,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const raw = result.response.text()
  return JSON.parse(raw) as QuizQuestion[]
}



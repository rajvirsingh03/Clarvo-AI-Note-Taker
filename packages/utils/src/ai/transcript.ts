/**
 * Extract the last N words from a string — used to build the context window
 * for incremental extraction (anti-hallucination, anti-repetition).
 */
export function getLastNWords(text: string, wordCount = 500): string {
  const words = text.trim().split(/\s+/)
  return words.slice(-wordCount).join(' ')
}

/**
 * Split a long transcript into chunks of approximately `targetWords` words,
 * respecting sentence boundaries where possible.
 */
export function chunkTranscript(transcript: string, targetWords = 300): string[] {
  if (!transcript.trim()) return []

  const sentences = transcript.match(/[^.!?]+[.!?]+/g) ?? [transcript]
  const chunks: string[] = []
  let currentChunk: string[] = []
  let wordCount = 0

  for (const sentence of sentences) {
    const words = sentence.trim().split(/\s+/)
    wordCount += words.length
    currentChunk.push(sentence.trim())

    if (wordCount >= targetWords) {
      chunks.push(currentChunk.join(' '))
      currentChunk = []
      wordCount = 0
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  return chunks
}

/**
 * Split text into individual sentences, preserving sentence-ending punctuation.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text?.trim()) return []
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text.trim() ? [text.trim()] : []
  return sentences.map((s) => s.trim()).filter(Boolean)
}

/**
 * Chunk a transcript into segments of approximately `targetWords` words
 * for batch LLM processing (Pipelines A & B).
 *
 * LLMs perform best with 1000–1500 tokens per chunk (~750–1125 words).
 * Respects sentence boundaries — won't split mid-sentence.
 */
export function chunkForLLM(transcript: string, targetWords = 1000): string[] {
  if (!transcript?.trim()) return []

  const sentences = splitIntoSentences(transcript)
  if (sentences.length === 0) return [transcript.trim()]

  const chunks: string[] = []
  let currentChunk: string[] = []
  let wordCount = 0

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length

    // If adding this sentence exceeds 120% of target and chunk has content, flush
    if (wordCount + sentenceWords > targetWords * 1.2 && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '))
      currentChunk = [sentence]
      wordCount = sentenceWords
    } else {
      currentChunk.push(sentence)
      wordCount += sentenceWords
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '))
  }

  return chunks
}

/**
 * Estimate the duration (in minutes) of a transcript based on average speaking rate.
 * Average speaking rate: 130 words/minute.
 */
export function estimateTranscriptDuration(transcript: string): number {
  const words = transcript.trim().split(/\s+/).length
  return Math.ceil(words / 130)
}

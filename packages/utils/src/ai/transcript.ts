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
 * Estimate the duration (in minutes) of a transcript based on average speaking rate.
 * Average speaking rate: 130 words/minute.
 */
export function estimateTranscriptDuration(transcript: string): number {
  const words = transcript.trim().split(/\s+/).length
  return Math.ceil(words / 130)
}

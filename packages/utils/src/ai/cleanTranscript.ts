/**
 * Transcript Cleaning — Rule-based preprocessing before LLM extraction.
 *
 * Steps:
 *  1. Remove filler words (um, uh, like, you know, etc.)
 *  2. Remove duplicate consecutive sentences
 *  3. Merge very short fragments (< 5 words) with neighbours
 *  4. Normalize whitespace
 */

const FILLER_PATTERNS: RegExp[] = [
  // Single filler words — match whole word only, optionally followed by comma
  /\b(?:um|uh|uhm|uhh|hmm|hm|mm|mhm|erm)\b[,.]?\s*/gi,
  // Multi-word fillers
  /\b(?:you know|i mean|sort of|kind of|basically|actually|literally|so yeah|okay so|alright so|right so)\b[,.]?\s*/gi,
  // Repeated "like" used as filler (not "I like X")
  /(?<=\s)like[,.]?\s+(?=\w)/gi,
]

/**
 * Remove filler words and verbal tics from a transcript.
 */
export function removeFillers(text: string): string {
  let cleaned = text
  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ')
  }
  return cleaned.replace(/\s{2,}/g, ' ').trim()
}

/**
 * Remove consecutive duplicate sentences.
 */
export function deduplicateSentences(sentences: string[]): string[] {
  if (sentences.length === 0) return []

  const result: string[] = [sentences[0]!]
  for (let i = 1; i < sentences.length; i++) {
    const prev = result[result.length - 1]!.toLowerCase().trim()
    const curr = sentences[i]!.toLowerCase().trim()
    if (curr !== prev) {
      result.push(sentences[i]!)
    }
  }
  return result
}

/**
 * Merge very short fragments (< minWords) into the previous sentence.
 */
export function mergeShortFragments(sentences: string[], minWords = 5): string[] {
  if (sentences.length === 0) return []

  const merged: string[] = [sentences[0]!]
  for (let i = 1; i < sentences.length; i++) {
    const s = sentences[i]!
    const words = s.trim().split(/\s+/)
    if (words.length < minWords && merged.length > 0) {
      merged[merged.length - 1] += ' ' + s.trim()
    } else {
      merged.push(s.trim())
    }
  }
  return merged
}

/**
 * Full transcript cleaning pipeline:
 *  removeFillers → split sentences → deduplicate → merge short → rejoin
 */
export function cleanTranscript(text: string): string {
  if (!text?.trim()) return ''

  // Step 1: Remove filler words
  let cleaned = removeFillers(text)

  // Step 2: Split into sentences
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g) ?? [cleaned]

  // Step 3: Remove duplicate consecutive sentences
  const deduped = deduplicateSentences(sentences.map((s) => s.trim()))

  // Step 4: Merge very short fragments
  const merged = mergeShortFragments(deduped)

  // Step 5: Normalize whitespace
  return merged.join(' ').replace(/\s{2,}/g, ' ').trim()
}

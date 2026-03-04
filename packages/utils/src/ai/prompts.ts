/**
 * Build the concept extraction prompt for Gemini 1.5 Pro.
 *
 * Anti-stenographer rule: NEVER reproduce verbatim transcript text.
 * Extract conceptual density. Output structured Markdown with KaTeX math.
 *
 * Follows the concept-extraction-prompting skill spec.
 */
export function buildConceptExtractionPrompt(
  transcriptChunk: string,
  existingNotesTail: string
): string {
  const contextSection = existingNotesTail.trim()
    ? `## Existing Notes (last ~500 words for context — DO NOT repeat, only append new concepts):\n${existingNotesTail.trim()}\n\n---\n\n`
    : ''

  return `You are an expert learning assistant embedded in a video lecture. 
Your job is to act as an active, conceptual learner — NOT a transcriptionist.

${contextSection}## New Transcript Chunk:
${transcriptChunk}

---

## Your Task:
Extract and structure the KEY CONCEPTS from this transcript chunk. Output clean, hierarchical Markdown.

### Rules:
1. **Anti-Stenographer**: NEVER reproduce sentences verbatim from the transcript. Synthesize and compress.
2. **Concept Density**: Every line must earn its place. No filler, no padding.
3. **Hierarchy**: Use H3 (###) for main concepts, H4 for sub-concepts, bullets for details.
4. **Math**: Render ALL mathematical expressions as KaTeX blocks:
   - Inline: $formula$
   - Block: $$\nformula\n$$
5. **No Redundancy**: If a concept was already covered in existing notes, don't repeat it — only add new depth.
6. **Completeness**: Capture definitions, relationships between concepts, and any examples or analogies used.
7. **No Headers for sections already in existing notes** — keep appending seamlessly.

Output ONLY the Markdown content. No preamble, no "Here are the notes:", just the structured content.`
}

/**
 * Build the flashcard generation prompt.
 * Output must be a valid JSON array of { front, back } objects.
 */
export function buildFlashcardPrompt(sessionNotes: string): string {
  return `You are an expert spaced repetition flashcard creator.

Given the following learning session notes, create a comprehensive set of flashcards to help the learner retain the key concepts.

## Session Notes:
${sessionNotes}

---

## Rules:
1. Create 10–20 flashcards depending on the depth of material.
2. Each card should test ONE concept, definition, formula, or relationship.
3. Fronts should be clear questions or prompts (not yes/no).
4. Backs should be concise but complete answers (2–4 sentences max).
5. For math/formulas: include the KaTeX formula in the back: $formula$
6. Do NOT create trivial cards (e.g., "What did the presenter say?").
7. Prioritize conceptual understanding over rote memorization.

Output a JSON array ONLY — no markdown wrapper, no explanation:
[
  { "front": "...", "back": "..." },
  ...
]`
}

/**
 * Build the action plan generation prompt.
 * Output is structured Markdown with verb-first checklist items and "why" context.
 */
export function buildActionPlanPrompt(sessionNotes: string): string {
  return `You are an expert learning-to-action coach.

Given the following learning session notes, create a practical action plan the learner can execute to apply what they've learned.

## Session Notes:
${sessionNotes}

---

## Rules:
1. Create 5–10 action items.
2. Each item must start with a verb (Implement, Practice, Review, Build, Test, etc.).
3. Each item must include a brief "why" explaining the value/motivation.
4. Items should be concrete and achievable, not vague suggestions.
5. Order items from most foundational to most advanced.
6. No duplicate or overlapping items.

## Output Format (Markdown):
### Action Plan

- [ ] **[Verb-first action]** — _Why: [brief rationale]_
- [ ] **[Verb-first action]** — _Why: [brief rationale]_
...

Output ONLY the Markdown content starting with "### Action Plan".`
}

---
name: concept-extraction-prompting
description: Use this skill whenever generating system prompts, structuring LLM outputs, or designing AI processing pipelines for the AI Learning Copilot. Apply this skill to avoid the "stenographer problem" (verbatim transcription) and instead force the AI to act as an active, conceptual learner. Load this skill when configuring the Incremental Summarization logic, multimodal screenshot analysis, flashcard generation, or Notion JSON export structures.
---

# Concept Extraction & Prompting Guidelines

This skill provides the core prompt engineering framework for the AI Learning Copilot. It ensures the AI extracts _meaning_ rather than just copying text. It covers four distinct AI processing layers:

1. **Incremental Concept Extraction** — Processing 3-minute transcript batches into structured notes.
2. **Multimodal Vision (Ctrl+K)** — Analyzing user-captured screenshots in the context of the audio.
3. **Interactive Study Generation** — Creating flashcards and quizzes from the finalized notes.
4. **Action Plan Synthesis** — Extracting concrete next steps from the video content.

Apply these guidelines universally across all LLM calls (Gemini 1.5 Pro / GPT-4o) to ensure high-quality, SaaS-grade educational outputs.

---

## 1. Incremental Concept Extraction (The "Anti-Stenographer" Rule)

When batch-processing the 3-minute (or 1,500-2,000 word) audio transcripts, the AI must explicitly discard verbal fluff and extract core frameworks.

### Core System Prompt Formula

> **Role:** You are an Ivy League student taking notes on a complex lecture.
> **Task:** Extract the core principles, definitions, and frameworks from this transcript chunk. Discard filler words, verbal crutches, and overly long anecdotes.
> **Constraint:** If an example is given, use it only briefly to illustrate the core concept. Do NOT transcribe the speaker verbatim.
> **Formatting:** Output strict Markdown. Use H2 for main topics, H3 for subtopics, bolding for key terms, and blockquotes for crucial definitions.
> **Math Constraint:** If math is spoken, format it strictly in KaTeX block format for Notion compatibility.

### Incremental Appending Logic

When appending a new batch to existing notes, the prompt must include:

- _Context:_ `[Previous 500 words of generated notes]`
- _New Input:_ `[New raw transcript chunk]`
- _Instruction:_ "Continue the structured notes seamlessly. Do not repeat concepts already covered in the previous notes. If the speaker is continuing the same thought, append to the existing hierarchy rather than starting a new H2."

---

## 2. Smart Multi-Modal Screenshots (Ctrl+K Processing)

When the user triggers a screenshot, the system passes an image and the preceding ~30 seconds of transcript to the Vision model. The AI must interpret the image, not just describe it.

| Visual Type       | AI Interpretation Strategy                                                             | Example Desired Output                                                                                                       |
| :---------------- | :------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
| **Data/Charts**   | Identify the trend, axes, and the main takeaway the speaker is highlighting.           | _"Graph: Demonstrates rapid location scaling from ~500 (2005) to ~1800 (2014), proving the market expansion thesis."_        |
| **Code Snippets** | Identify the language, the purpose of the function, and any highlighted lines.         | _"Code: React Context API implementation for global auth state. Note the `useMemo` hook to prevent unnecessary re-renders."_ |
| **Math/Formulas** | Translate the visual equation into KaTeX and explain the variables based on the audio. | _"Equation: $E=mc^2$. Defines mass-energy equivalence, where c represents the speed of light."_                              |
| **UI/UX Slides**  | Identify the design pattern or heuristic being shown.                                  | _"Diagram: User flow for the new checkout process, highlighting the 1-click payment bypass."_                                |

---

## 3. Post-Processing: Flashcards & Quizzes

Triggered only when the state changes to `COMPLETED` and the user requests them. Do not use the raw transcript for this; use the _finalized structured notes_ as the context window to save tokens and improve accuracy.

### Flashcard Generation Rules (JSON Output)

- **Target:** Extract hard definitions, formulas, dates, and core mechanics.
- **Format:** Strict JSON array of `{ "front": "string", "back": "string" }`.
- **Constraint:** The `front` must be a specific question. The `back` must be a concise, single-paragraph answer.
- _Bad:_ Front: "Growth." Back: "It means scaling intentionally."
- _Good:_ Front: "What defines 'Strategic Growth' compared to standard growth?" Back: "It is intentional, proactive, and directly advances the company's core mission and purpose, rather than just reacting to market pressure."

---

## 4. Post-Processing: Action Plan Synthesis

Action plans transition the user from passive learning to active implementation.

### Prompt Directives

1.  **Identify Imperatives:** Scan the final notes for commands, best practices, or step-by-step tutorials.
2.  **Translate to Tasks:** Convert these into actionable checklists.
3.  **Verb-First Formatting:** Every action item must start with a strong verb (e.g., _Refactor, Implement, Review, Design, Calculate_).
4.  **Contextualize:** Add a brief "Why" to each step based on the video's context.

---

## AI Output Quality Rubric

Score prompt outputs across these dimensions to ensure SaaS-grade quality.

| Dimension              | 1-3 (Stenographer/Poor)                                  | 4-6 (Adequate)                                                         | 7-10 (Copilot/Excellent)                                                   |
| :--------------------- | :------------------------------------------------------- | :--------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **Concept Density**    | 90% transcript / 10% concepts. Full of "uhs" and filler. | 50/50. Captures main ideas but includes unnecessary speaker anecdotes. | 100% signal. Pure concepts, frameworks, and actionable data.               |
| **Hierarchy**          | Flat bulleted list or a massive wall of text.            | Basic headings, but illogical groupings.                               | Perfect Markdown hierarchy (H2, H3, bulleted sub-points, bolded terms).    |
| **Visual Integration** | Screenshot dropped in with no text.                      | Basic literal description ("This is a chart").                         | Insightful caption connecting the visual directly to the core concept.     |
| **Notion Readiness**   | Standard text that requires heavy user formatting.       | Markdown that maps decently but breaks on complex elements.            | Flawless mapping to Notion Blocks (KaTeX, Callouts, nested bullet blocks). |

- **Below 6/10:** Prompt needs strict constraints (e.g., "Do NOT output X").
- **7-8/10:** Good, but likely needs token optimization (cost control).
- **9-10/10:** Production ready.

---

## Reference Logic States

For system alignment, ensure prompts respect the current application state:

- `RECORDING`: Use Incremental Extraction prompts. Focus on speed and appending.
- `COMPLETED`: Trigger Finalization Pass. Clean up Markdown, merge duplicates.
- `POST-PROCESSING`: Trigger Flashcard, Quiz, and Action Plan JSON prompts.

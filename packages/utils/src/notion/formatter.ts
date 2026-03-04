import type { NotionBlock } from '@clarvo/types'
import type { Flashcard } from '@clarvo/types'

interface FormatOptions {
  flashcards?: Array<{ front: string; back: string }>
  screenshots?: Array<{ caption: string | null; storage_path: string }>
}

/**
 * Convert Markdown notes (with optional KaTeX) to Notion API block objects.
 * Supports: headings, bulleted lists, numbered lists, paragraphs, math equations, dividers.
 *
 * Notion API docs: https://developers.notion.com/reference/block
 */
export function formatNotionBlocks(notes: string, options: FormatOptions = {}): NotionBlock[] {
  const blocks: NotionBlock[] = []
  const lines = notes.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (!trimmed) {
      i++
      continue
    }

    // Block KaTeX equation: $$\n...\n$$
    if (trimmed === '$$') {
      const equationLines: string[] = []
      i++
      while (i < lines.length && (lines[i] ?? '').trim() !== '$$') {
        equationLines.push(lines[i] ?? '')
        i++
      }
      blocks.push({
        type: 'equation',
        equation: { expression: equationLines.join('\n') },
      })
      i++ // skip closing $$
      continue
    }

    // Headings
    if (trimmed.startsWith('#### ')) {
      blocks.push(createRichTextBlock('heading_3', trimmed.slice(5)))
    } else if (trimmed.startsWith('### ')) {
      blocks.push(createRichTextBlock('heading_3', trimmed.slice(4)))
    } else if (trimmed.startsWith('## ')) {
      blocks.push(createRichTextBlock('heading_2', trimmed.slice(3)))
    } else if (trimmed.startsWith('# ')) {
      blocks.push(createRichTextBlock('heading_1', trimmed.slice(2)))
    }
    // Horizontal rule
    else if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      blocks.push({ type: 'divider', divider: {} })
    }
    // Checkbox (unchecked)
    else if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
      blocks.push({
        type: 'to_do',
        to_do: {
          rich_text: parseInlineMarkdown(trimmed.slice(6)),
          checked: false,
        },
      })
    }
    // Checkbox (checked)
    else if (trimmed.startsWith('- [x] ') || trimmed.startsWith('* [x] ')) {
      blocks.push({
        type: 'to_do',
        to_do: {
          rich_text: parseInlineMarkdown(trimmed.slice(6)),
          checked: true,
        },
      })
    }
    // Bulleted list
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push(createRichTextBlock('bulleted_list_item', trimmed.slice(2)))
    }
    // Numbered list
    else if (/^\d+\. /.test(trimmed)) {
      const content = trimmed.replace(/^\d+\. /, '')
      blocks.push(createRichTextBlock('numbered_list_item', content))
    }
    // Paragraph
    else {
      blocks.push(createRichTextBlock('paragraph', trimmed))
    }

    i++
  }

  // Append flashcards section if provided
  if (options.flashcards && options.flashcards.length > 0) {
    blocks.push({ type: 'divider', divider: {} })
    blocks.push(createRichTextBlock('heading_2', '🃏 Flashcards'))

    for (const card of options.flashcards) {
      blocks.push({
        type: 'toggle',
        toggle: {
          rich_text: parseInlineMarkdown(`**Q:** ${card.front}`),
          children: [
            createRichTextBlock('paragraph', `**A:** ${card.back}`),
          ],
        },
      })
    }
  }

  // Append screenshots section if provided
  if (options.screenshots && options.screenshots.length > 0) {
    const captionedScreenshots = options.screenshots.filter((s) => s.caption)
    if (captionedScreenshots.length > 0) {
      blocks.push({ type: 'divider', divider: {} })
      blocks.push(createRichTextBlock('heading_2', '📸 Screenshots'))

      for (const screenshot of captionedScreenshots) {
        blocks.push({
          type: 'callout',
          callout: {
            rich_text: parseInlineMarkdown(screenshot.caption!),
            icon: { type: 'emoji', emoji: '🖼️' },
          },
        })
      }
    }
  }

  return blocks
}

/** Create a simple rich text block for headings, paragraphs, lists */
function createRichTextBlock(type: string, text: string): NotionBlock {
  return {
    type,
    [type]: {
      rich_text: parseInlineMarkdown(text),
    },
  }
}

/**
 * Parse inline Markdown (bold, italic, inline code, inline math) into Notion rich text array.
 * Simplified implementation supporting **bold**, _italic_, `code`, $math$.
 */
function parseInlineMarkdown(text: string): Array<Record<string, unknown>> {
  // Simplified: return as plain text with basic annotations
  // A full implementation would tokenize and annotate each segment
  return [
    {
      type: 'text',
      text: { content: stripInlineMarkdown(text) },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: 'default',
      },
    },
  ]
}

/** Strip markdown syntax for use as plain Notion text (simplified) */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/_(.+?)_/g, '$1')         // italic alt
    .replace(/`(.+?)`/g, '$1')         // inline code
    .replace(/\$(.+?)\$/g, '$1')       // inline math
    .trim()
}

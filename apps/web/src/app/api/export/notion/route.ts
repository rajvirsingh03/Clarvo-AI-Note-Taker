import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { Client as NotionClient } from '@notionhq/client'
import type {
  BlockObjectRequest,
  CreateDatabaseParameters,
  CreatePageParameters,
} from '@notionhq/client/build/src/api-endpoints'
import { generateActionPlan } from '@/lib/gemini'
import { z } from 'zod'

const WORKSPACE_DB_NAME = 'Clarvo AI Workspace'
const NOTION_BLOCK_BATCH = 90 // Notion API limit is 100; stay under to be safe

const Schema = z.object({
  sessionId: z.string().uuid(),
  course: z.string().optional(),
  module: z.string().optional(),
  lesson: z.string().optional(),
})

// ── Notion block builders ──────────────────────────────────────────────────────

function richText(content: string): Array<{ type: 'text'; text: { content: string } }> {
  return [{ type: 'text', text: { content: content.slice(0, 2000) } }]
}

function heading1(text: string): BlockObjectRequest {
  return { object: 'block', type: 'heading_1', heading_1: { rich_text: richText(text) } } as BlockObjectRequest
}

function heading2(text: string): BlockObjectRequest {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: richText(text) } } as BlockObjectRequest
}

function paragraph(text: string): BlockObjectRequest {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText(text) } } as BlockObjectRequest
}

function divider(): BlockObjectRequest {
  return { object: 'block', type: 'divider', divider: {} } as BlockObjectRequest
}

function callout(text: string, emoji: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: richText(text),
      icon: { type: 'emoji', emoji },
    },
  } as BlockObjectRequest
}

function todoBlock(text: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'to_do',
    to_do: { rich_text: richText(text), checked: false },
  } as BlockObjectRequest
}

function bulletItem(text: string): BlockObjectRequest {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: richText(text) },
  } as BlockObjectRequest
}

/** Convert raw Markdown notes into Notion block objects */
function markdownToBlocks(md: string): BlockObjectRequest[] {
  const blocks: BlockObjectRequest[] = []
  const lines = md.split('\n')

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    if (line.startsWith('#### ') || line.startsWith('### ')) {
      const text = line.replace(/^#{3,4} /, '')
      blocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: richText(text) } } as BlockObjectRequest)
    } else if (line.startsWith('## ')) {
      blocks.push(heading2(line.slice(3)))
    } else if (line.startsWith('# ')) {
      blocks.push(heading1(line.slice(2)))
    } else if (line === '---' || line === '***') {
      blocks.push(divider())
    } else if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) {
      blocks.push(todoBlock(line.slice(6)))
    } else if (line.startsWith('- [x] ') || line.startsWith('* [x] ')) {
      blocks.push({
        object: 'block',
        type: 'to_do',
        to_do: { rich_text: richText(line.slice(6)), checked: true },
      } as BlockObjectRequest)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push(bulletItem(line.slice(2)))
    } else if (/^\d+\. /.test(line)) {
      const content = line.replace(/^\d+\. /, '')
      blocks.push({
        object: 'block',
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: richText(content) },
      } as BlockObjectRequest)
    } else {
      // Strip inline KaTeX markers for plain paragraph rendering
      const cleaned = line.replace(/\$\$?[^$]*\$\$?/g, '[formula]')
      blocks.push(paragraph(cleaned))
    }
  }
  return blocks
}

/** Append blocks in batches to avoid Notion's 100-block limit */
async function appendBlocksBatched(
  notion: NotionClient,
  pageId: string,
  blocks: BlockObjectRequest[]
): Promise<void> {
  for (let i = 0; i < blocks.length; i += NOTION_BLOCK_BATCH) {
    const batch = blocks.slice(i, i + NOTION_BLOCK_BATCH)
    await notion.blocks.children.append({
      block_id: pageId,
      children: batch as Parameters<typeof notion.blocks.children.append>[0]['children'],
    })
  }
}

/** Format seconds as human-readable duration */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return m > 0 && s > 0 ? `${m}m ${s}s` : `${m}m`
}

/**
 * Get or create the "Clarvo AI Workspace" Notion database.
 * If `storedDbId` exists, verify it's still accessible and return it.
 * Otherwise search for it, then create it using the first accessible parent page.
 */
async function getOrCreateWorkspaceDatabase(
  notion: NotionClient,
  storedDbId: string | null
): Promise<string> {
  // 1. Use stored ID if it still works
  if (storedDbId) {
    try {
      await notion.databases.retrieve({ database_id: storedDbId })
      return storedDbId
    } catch {
      // Database no longer accessible — will recreate
    }
  }

  // 2. Search for existing "Clarvo AI Workspace" database
  try {
    const searchRes = await notion.search({
      query: WORKSPACE_DB_NAME,
      filter: { value: 'database', property: 'object' },
      page_size: 5,
    })
    const existing = searchRes.results.find((r) => {
      if (r.object !== 'database') return false
      const db = r as { title?: Array<{ plain_text?: string }> }
      return db.title?.[0]?.plain_text === WORKSPACE_DB_NAME
    })
    if (existing) return existing.id
  } catch {
    // Search failed — continue to create
  }

  // 3. Find a parent page to house the new database
  const searchPages = await notion.search({
    filter: { value: 'page', property: 'object' },
    page_size: 1,
  })

  let parentPageId: string | null = searchPages.results[0]?.id ?? null

  // 4. If no accessible page found, create one at the workspace root
  if (!parentPageId) {
    const rootPage = await notion.pages.create({
      // Workspace-level parent (works with full workspace OAuth)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parent: { type: 'workspace', workspace: true } as unknown as CreatePageParameters['parent'],
      properties: {
        title: { title: [{ type: 'text', text: { content: 'Clarvo AI' } }] },
      },
    })
    parentPageId = rootPage.id
  }

  // 5. Create the database
  const dbProps: CreateDatabaseParameters['properties'] = {
    'Session': { title: {} },
    'Course': { rich_text: {} },
    'Module': { rich_text: {} },
    'Lesson': { rich_text: {} },
    'Date': { date: {} },
    'Source URL': { url: {} },
    'Duration': { rich_text: {} },
    'Status': {
      select: {
        options: [
          { name: 'Exported', color: 'green' },
          { name: 'Review', color: 'yellow' },
        ],
      },
    },
  }

  const db = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: WORKSPACE_DB_NAME } }],
    icon: { type: 'emoji', emoji: '🎓' },
    is_inline: false,
    properties: dbProps,
  })

  return db.id
}

// ── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier, notion_access_token, notion_workspace_id, notion_database_id')
      .eq('id', user.id)
      .single()

    if (!profile?.notion_access_token) {
      return NextResponse.json(
        { error: 'Notion not connected.', notionRequired: true },
        { status: 422 }
      )
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { sessionId, course, module: mod, lesson } = parsed.data

    type SessionWithRelations = {
      id: string
      title: string
      notes: string
      state: string
      duration_seconds: number
      watch_time_seconds: number | null
      video_url: string | null
      video_title: string | null
      created_at: string
      flashcards: Array<{ front: string; back: string }>
      screenshots: Array<{ id: string; analysis: string | null }>
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('id, title, notes, state, duration_seconds, watch_time_seconds, video_url, video_title, created_at, flashcards(front, back), screenshots(id, analysis)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single() as { data: SessionWithRelations | null; error: unknown }

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const notion = new NotionClient({ auth: profile.notion_access_token })

    // ── Get/create database ────────────────────────────────────────────────────
    const databaseId = await getOrCreateWorkspaceDatabase(
      notion,
      (profile as Record<string, unknown>).notion_database_id as string | null
    )

    // Persist database ID for future exports (skip billing check — always available)
    if ((profile as Record<string, unknown>).notion_database_id !== databaseId) {
      await supabase
        .from('users')
        .update({ notion_database_id: databaseId, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // ── Generate action plan if notes exist ───────────────────────────────────
    let actionPlanText = ''
    if (session.notes?.trim()) {
      try {
        actionPlanText = await generateActionPlan(session.notes)
      } catch {
        // Non-fatal — export proceeds without action plan
      }
    }

    // ── Create database row (the page) ────────────────────────────────────────
    const durationSeconds = session.watch_time_seconds ?? session.duration_seconds ?? 0
    const pageDate = session.created_at ? session.created_at.split('T')[0] : new Date().toISOString().split('T')[0]

    const pageProperties: CreatePageParameters['properties'] = {
      Session: {
        title: [{ type: 'text', text: { content: session.title ?? 'Untitled Session' } }],
      },
      Date: { date: { start: pageDate! } },
      Duration: { rich_text: [{ type: 'text', text: { content: formatDuration(durationSeconds) } }] },
      Status: { select: { name: 'Exported' } },
    }
    if (session.video_url) {
      pageProperties['Source URL'] = { url: session.video_url }
    }
    if (course) {
      pageProperties['Course'] = { rich_text: [{ type: 'text', text: { content: course } }] }
    }
    if (mod) {
      pageProperties['Module'] = { rich_text: [{ type: 'text', text: { content: mod } }] }
    }
    if (lesson) {
      pageProperties['Lesson'] = { rich_text: [{ type: 'text', text: { content: lesson } }] }
    }

    const dbPage = await notion.pages.create({
      parent: { database_id: databaseId },
      icon: { type: 'emoji', emoji: '📚' },
      properties: pageProperties,
    })

    // ── Build page body ────────────────────────────────────────────────────────
    const source = session.video_url ?? 'No source URL'
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date(session.created_at))

    const overviewBlocks: BlockObjectRequest[] = [
      heading2('📊 Overview'),
      callout(
        [
          `📅 Date: ${formattedDate}`,
          `⏱ Duration: ${formatDuration(durationSeconds)}`,
          `🔗 Source: ${source}`,
          session.video_title ? `🎬 Video: ${session.video_title}` : '',
          course ? `📚 Course: ${course}` : '',
          mod ? `📂 Module: ${mod}` : '',
          lesson ? `📖 Lesson: ${lesson}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
        '📊'
      ),
      divider(),
    ]

    // Notes section
    const notesBlocks: BlockObjectRequest[] = [
      heading2('📝 AI Structured Notes'),
      ...markdownToBlocks(session.notes ?? ''),
      divider(),
    ]

    // Action plan section
    const actionBlocks: BlockObjectRequest[] = [
      heading2('✅ Action Plan'),
    ]
    if (actionPlanText.trim()) {
      const apLines = actionPlanText.split('\n').filter((l) => l.trim())
      for (const line of apLines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        // Strip markdown checkbox markers
        const text = trimmed
          .replace(/^[-*]\s*\[[ x]\]\s*/, '')
          .replace(/^[-*]\s*/, '')
          .replace(/\*\*/g, '')
          .replace(/_/g, '')
        if (text) actionBlocks.push(todoBlock(text))
      }
    } else {
      actionBlocks.push(paragraph('No action plan generated for this session.'))
    }
    actionBlocks.push(divider())

    // Flashcards section — rendered as a table
    const flashcardBlocks: BlockObjectRequest[] = [
      heading2('🃏 Flashcards'),
    ]
    const cards = session.flashcards ?? []
    if (cards.length > 0) {
      flashcardBlocks.push(paragraph(`${cards.length} flashcard${cards.length !== 1 ? 's' : ''} generated for this session.`))
      // Notion table block
      const tableBlock: BlockObjectRequest = {
        object: 'block',
        type: 'table',
        table: {
          table_width: 2,
          has_column_header: true,
          has_row_header: false,
          children: [
            // Header row
            {
              object: 'block',
              type: 'table_row',
              table_row: {
                cells: [
                  [{ type: 'text', text: { content: 'Question (Front)' }, annotations: { bold: true } }],
                  [{ type: 'text', text: { content: 'Answer (Back)' }, annotations: { bold: true } }],
                ],
              },
            } as BlockObjectRequest,
            // Data rows
            ...cards.slice(0, 50).map(
              (fc): BlockObjectRequest => ({
                object: 'block',
                type: 'table_row',
                table_row: {
                  cells: [
                    [{ type: 'text', text: { content: fc.front.slice(0, 2000) } }],
                    [{ type: 'text', text: { content: fc.back.slice(0, 2000) } }],
                  ],
                },
              })
            ),
          ],
        },
      } as BlockObjectRequest
      flashcardBlocks.push(tableBlock)
    } else {
      flashcardBlocks.push(paragraph('No flashcards generated for this session yet.'))
    }

    // ── Append all sections to the page ───────────────────────────────────────
    await appendBlocksBatched(notion, dbPage.id, overviewBlocks)
    await appendBlocksBatched(notion, dbPage.id, notesBlocks)
    await appendBlocksBatched(notion, dbPage.id, actionBlocks)
    await appendBlocksBatched(notion, dbPage.id, flashcardBlocks)

    // ── Persist Notion page ID on the session ─────────────────────────────────
    await supabase
      .from('sessions')
      .update({ notion_page_id: dbPage.id, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    const notionUrl = `https://notion.so/${dbPage.id.replace(/-/g, '')}`
    return NextResponse.json({ success: true, notionPageId: dbPage.id, notionPageUrl: notionUrl })
  } catch (error) {
    console.error('[POST /api/export/notion]', error)
    const msg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

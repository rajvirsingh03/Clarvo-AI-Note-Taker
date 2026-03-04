import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNotionBlocks } from '@clarvo/utils'
import { Client as NotionClient } from '@notionhq/client'
import { z } from 'zod'

const Schema = z.object({
  sessionId: z.string().uuid(),
  notionDatabaseId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('users')
      .select('billing_tier, notion_access_token, notion_workspace_id')
      .eq('id', user.id)
      .single()

    if (profile?.billing_tier === 'FREE') {
      return NextResponse.json(
        { error: 'Notion export requires Clarvo Pro.', upgradeRequired: true },
        { status: 402 }
      )
    }

    if (!profile?.notion_access_token) {
      return NextResponse.json({ error: 'Notion not connected. Visit /connect-notion.' }, { status: 422 })
    }

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

    const { sessionId, notionDatabaseId } = parsed.data

    type SessionWithRelations = {
      id: string
      title: string
      notes: string
      flashcards: Array<{ front: string; back: string }>
      screenshots: Array<{ analysis: string | null; data_url: string }>
    }

    const { data: session } = await supabase
      .from('sessions')
      .select('id, title, notes, flashcards(front, back), screenshots(analysis, data_url)')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single() as { data: SessionWithRelations | null; error: unknown }

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const notion = new NotionClient({ auth: profile.notion_access_token })

    const blocks = formatNotionBlocks(session.notes ?? '', {
      flashcards: session.flashcards,
      screenshots: session.screenshots,
    })

    const page = await notion.pages.create({
      parent: notionDatabaseId
        ? { database_id: notionDatabaseId }
        : { page_id: profile.notion_workspace_id! },
      properties: {
        title: {
          title: [{ text: { content: session.title ?? 'Clarvo Learning Session' } }],
        },
      },
      children: blocks as any,
    })

    // Save the Notion page ID back to the session
    await supabase
      .from('sessions')
      .update({ notion_page_id: page.id, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    return NextResponse.json({ success: true, notionPageId: page.id, notionPageUrl: `https://notion.so/${page.id.replace(/-/g, '')}` })
  } catch (error) {
    console.error('[POST /api/export/notion]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

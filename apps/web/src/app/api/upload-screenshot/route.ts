import { NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase/auth'
import { z } from 'zod'

const Schema = z.object({
  dataUrl: z.string().startsWith('data:image/'),
  sessionId: z.string().uuid(),
  screenshotId: z.string().max(100).regex(/^[\w-]+$/),
})

/** POST /api/upload-screenshot
 *
 * Accepts a base64 data URL, uploads it to Supabase Storage under
 * `screenshots/{userId}/{sessionId}/{screenshotId}.{ext}`, and returns
 * the public https:// URL.  Called by the side panel immediately after
 * the user takes a screenshot so the TipTap editor can swap the heavy
 * base64 src for a lightweight public URL.
 */
export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthenticatedClient(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.issues }, { status: 400 })
    }

    const { dataUrl, sessionId, screenshotId } = parsed.data

    // Verify the session belongs to this user (prevents uploading to someone else's session)
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Parse data URL:  data:image/{ext};base64,{data}
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/)
    if (!match) {
      return NextResponse.json({ error: 'Unsupported image format' }, { status: 400 })
    }

    const [, rawExt, base64Data] = match as [string, string, string]
    const ext = rawExt === 'jpg' ? 'jpeg' : rawExt
    const buffer = Buffer.from(base64Data, 'base64')

    if (buffer.length > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 5 MB)' }, { status: 413 })
    }

    const filePath = `${user.id}/${sessionId}/${screenshotId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filePath, buffer, {
        contentType: `image/${ext}`,
        upsert: true, // idempotent — safe to retry
      })

    if (uploadError) {
      console.error('[upload-screenshot] Storage upload failed:', uploadError.message)
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('screenshots').getPublicUrl(filePath)

    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err) {
    console.error('[POST /api/upload-screenshot]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

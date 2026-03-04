import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Session Detail' }

interface Props {
  params: Promise<{ id: string }>
}

// TODO: Session detail — notes viewer, flashcard deck, action plan, export button
export default async function SessionDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <div>
      <h1>Session {id}</h1>
    </div>
  )
}

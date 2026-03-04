import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Connect Notion' }

// TODO: Implement Notion OAuth initiation with redirect to Notion auth URL
export default function ConnectNotionPage() {
  return (
    <main>
      <h1>Connect Notion</h1>
      <p>Connect your Notion workspace to export learning sessions.</p>
    </main>
  )
}

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welcome to Clarvo AI' }

// TODO: Implement onboarding wizard (name, use-case, Notion connect prompt)
export default function WelcomePage() {
  return (
    <main>
      <h1>Welcome to Clarvo AI 🎉</h1>
      <p>Let&apos;s get you set up.</p>
    </main>
  )
}

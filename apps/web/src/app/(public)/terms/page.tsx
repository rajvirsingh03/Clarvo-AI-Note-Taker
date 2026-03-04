import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <main className="prose mx-auto px-4 py-16">
      <h1>Terms of Service</h1>
      <p>Last updated: March 4, 2026</p>
      <p>
        By using Clarvo AI, you agree to these terms. Please read them carefully.
      </p>
      {/* TODO: Full terms of service content */}
    </main>
  )
}

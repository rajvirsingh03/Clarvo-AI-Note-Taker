import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <main className="prose mx-auto px-4 py-16">
      <h1>Privacy Policy</h1>
      <p>Last updated: March 4, 2026</p>
      <p>
        Clarvo AI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your
        privacy. This policy explains how we collect, use, and safeguard your data.
      </p>
      {/* TODO: Full privacy policy content */}
    </main>
  )
}

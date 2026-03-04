import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

// TODO: Implement dashboard with recent sessions, stats, extension CTA
export default function AppDashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome back! Your recent sessions will appear here.</p>
    </div>
  )
}

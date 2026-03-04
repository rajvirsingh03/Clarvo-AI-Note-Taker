/** Color token constants — mirrors CSS variables in globals.css */
export const colors = {
  base: '#0a0a0f',
  surface: '#111118',
  surfaceRaised: '#1a1a24',
  surfaceOverlay: '#22222f',
  border: '#2a2a3a',
  borderSubtle: '#1e1e2a',
  textPrimary: '#f0f0f5',
  textSecondary: '#9090a8',
  textTertiary: '#5a5a70',
  accent: '#6c63ff',
  accentDim: '#2d2860',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
} as const

export type ColorToken = keyof typeof colors

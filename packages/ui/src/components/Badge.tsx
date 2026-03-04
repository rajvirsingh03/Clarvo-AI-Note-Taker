import React from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'pro' | 'free'

export interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default:   'bg-surface-overlay text-text-secondary border border-border',
  success:   'bg-success/10 text-success border border-success/20',
  warning:   'bg-warning/10 text-warning border border-warning/20',
  error:     'bg-error/10 text-error border border-error/20',
  pro:       'bg-accent/10 text-accent border border-accent/30',
  free:      'bg-surface-overlay text-text-tertiary border border-border-subtle',
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium font-body',
        variantClasses[variant],
        className,
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </span>
  )
}

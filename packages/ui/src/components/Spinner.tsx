import React from 'react'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-[3px]',
}

export function Spinner({ size = 'md', label = 'Loading...', className = '' }: SpinnerProps) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        className,
      ].join(' ')}
      role="status"
      aria-label={label}
    >
      <span
        className={[
          'rounded-full border-text-tertiary border-t-accent animate-spin',
          sizeClasses[size],
        ].join(' ')}
        aria-hidden="true"
      />
    </span>
  )
}

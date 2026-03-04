import React from 'react'

export interface CardProps {
  children: React.ReactNode
  className?: string
  as?: React.ElementType
  elevated?: boolean
  /** If true, adds hover styles for interactive cards */
  interactive?: boolean
}

export function Card({
  children,
  className = '',
  as: Tag = 'div',
  elevated = false,
  interactive = false,
}: CardProps) {
  return (
    <Tag
      className={[
        'rounded-lg border border-border bg-surface p-6',
        elevated ? 'shadow-md' : '',
        interactive
          ? 'cursor-pointer transition-all duration-150 hover:border-accent hover:shadow-accent hover:-translate-y-0.5'
          : '',
        className,
      ]
        .join(' ')
        .trim()}
    >
      {children}
    </Tag>
  )
}

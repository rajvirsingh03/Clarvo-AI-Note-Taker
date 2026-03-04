import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-base shadow-accent',
  secondary:
    'bg-surface-raised text-text-primary border border-border hover:bg-surface-overlay',
  ghost:
    'bg-transparent text-text-secondary hover:bg-surface-raised hover:text-text-primary',
  outline:
    'bg-transparent border border-accent text-accent hover:bg-accent-dim',
  danger:
    'bg-error text-white hover:brightness-110 focus-visible:ring-2 focus-visible:ring-error',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 min-w-touch',
  md: 'h-11 px-5 text-base gap-2 min-w-touch min-h-touch',  // 44px touch target
  lg: 'h-13 px-7 text-lg gap-2.5 min-w-touch',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-body font-medium rounded-md transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .join(' ')
        .trim()}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} />
      ) : (
        <>
          {leftIcon && <span aria-hidden>{leftIcon}</span>}
          {children}
          {rightIcon && <span aria-hidden>{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

// Import here to avoid circular dep issue in index.ts
import { Spinner } from './Spinner'

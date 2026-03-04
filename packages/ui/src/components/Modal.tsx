import React, { useEffect, useRef } from 'react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  /** Size of the modal */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
}

export function Modal({ isOpen, onClose, title, children, className = '', size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Trap focus inside modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className={[
          'relative w-full rounded-xl border border-border bg-surface-raised p-6 shadow-lg',
          'animate-in fade-in-0 zoom-in-95 duration-150',
          sizeClasses[size],
          className,
        ]
          .join(' ')
          .trim()}
      >
        {title && (
          <h2
            id="modal-title"
            className="font-display text-lg font-semibold text-text-primary mb-4"
          >
            {title}
          </h2>
        )}

        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-text-tertiary hover:text-text-primary transition-colors min-h-touch min-w-touch flex items-center justify-center rounded-md"
          aria-label="Close modal"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  )
}

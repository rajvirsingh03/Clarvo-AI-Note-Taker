export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s avatar` : 'User avatar'}
        className={[
          'rounded-full object-cover border border-border flex-shrink-0',
          sizeClasses[size],
          className,
        ].join(' ')}
      />
    )
  }

  return (
    <span
      className={[
        'rounded-full bg-accent-dim text-accent font-display font-semibold',
        'flex items-center justify-center flex-shrink-0 border border-accent/20',
        sizeClasses[size],
        className,
      ].join(' ')}
      aria-label={name ? `${name}'s avatar` : 'User avatar'}
    >
      {name ? getInitials(name) : '?'}
    </span>
  )
}

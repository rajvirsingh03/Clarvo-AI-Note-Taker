/** Typography tokens — Syne (display) + DM Sans (body) */
export const typography = {
  fontDisplay: '"Syne", sans-serif',
  fontBody: '"DM Sans", sans-serif',
  /** Modular scale (1.25 ratio, base 16px) */
  scale: {
    xs:   '0.75rem',   // 12px
    sm:   '0.875rem',  // 14px
    base: '1rem',      // 16px
    md:   '1.125rem',  // 18px
    lg:   '1.25rem',   // 20px
    xl:   '1.5rem',    // 24px
    '2xl': '1.875rem', // 30px
    '3xl': '2.25rem',  // 36px
    '4xl': '3rem',     // 48px
  },
  weight: {
    light:   '300',
    regular: '400',
    medium:  '500',
    semibold: '600',
    bold:    '700',
    extrabold: '800',
  },
  lineHeight: {
    tight:   '1.25',
    snug:    '1.375',
    normal:  '1.5',
    relaxed: '1.625',
    loose:   '2',
  },
} as const

/** 4pt spatial grid spacing tokens */
export const spacing = {
  0:  '0px',
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
  32: '128px',
} as const

/** Breakpoints following ux-foundations skill (mobile-first) */
export const breakpoints = {
  xs:  '320px',
  sm:  '480px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
} as const

/** WCAG 2.2 AA minimum touch target size */
export const MIN_TOUCH_TARGET = '44px'

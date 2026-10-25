// Design tokens — "Light, Warm, Alive". See docs/DESIGN_SYSTEM.md.

export const colors = {
  bg: '#FBF7EF', // Cream Linen
  surface: '#FFFFFF', // Warm White
  surfaceAlt: '#F3ECDD', // Soft Sand
  primary: '#4F7A63', // Deep Sage
  primarySoft: '#DCEBE0', // Mist Sage
  accent: '#D9A441', // Soft Gold
  accentSoft: '#F6E3B4', // Honey Glow
  ink: '#1F2D26', // Ink Green
  muted: '#6B7A72', // Stone
  success: '#3E9B6B', // Fern
  attention: '#E39A2D', // Amber
  firm: '#C8553D', // Terracotta
  info: '#6FA8C7', // Sky Mist
  hairline: '#E9E1D0',
  // Text-safe darker variants for small text on cream (WCAG AA ≥ 4.5:1)
  primaryText: '#3F654F',
  accentText: '#8A6418',
  firmText: '#A8432E',
} as const;

export const space = (n: number) => n * 8;

export const radius = { sm: 12, md: 20, lg: 28, pill: 999 } as const;

export const fonts = {
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  body: 'PlusJakartaSans_400Regular',
  bodyMedium: 'PlusJakartaSans_500Medium',
  bodySemi: 'PlusJakartaSans_600SemiBold',
  bodyBold: 'PlusJakartaSans_700Bold',
  hindi: 'NotoSansDevanagari_500Medium',
} as const;

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ink },
  h1: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink },
  title: { fontFamily: fonts.bodySemi, fontSize: 17, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.ink },
  label: { fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.muted },
  caption: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18, color: colors.muted },
  number: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34, color: colors.ink },
  hindi: { fontFamily: fonts.hindi, fontSize: 13, lineHeight: 20, color: colors.muted },
} as const;

// Soft layered shadow with a green-gold tint.
export const shadow = {
  card: {
    shadowColor: '#4F6A3A',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  float: {
    shadowColor: '#4F6A3A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;

export const motion = { fast: 180, base: 280, slow: 350 } as const;

export const touch = { min: 48 } as const;

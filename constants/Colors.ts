/** Warm parchment + charcoal from Lovable.dev, with gym orange as the accent. */
export const Canvas = {
  light: '#F7F4ED',
  dark: '#121211',
} as const;

export const Typeface = {
  web: 'DM Sans, ui-sans-serif, system-ui, sans-serif',
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Horizontal page inset; matches the tab header title and hamburger. */
export const SCREEN_GUTTER = 16;

const tintLight = '#E56A12';
const tintDark = '#FF8B3D';

export default {
  light: {
    text: '#1C1C1C',
    textSecondary: '#5F5F5D',
    background: Canvas.light,
    card: '#FCFBF8',
    border: '#E4E0D6',
    tint: tintLight,
    onTint: '#FCFBF8',
    primary: '#1C1C1C',
    onPrimary: '#FCFBF8',
    tabIconDefault: '#A5A19B',
    tabIconSelected: tintLight,
    success: '#3F7D4E',
    danger: '#DC3B32',
    muted: '#EFECE4',
    tintMuted: '#F3E4D4',
  },
  dark: {
    text: '#FCFBF8',
    textSecondary: '#C5C1BA',
    background: Canvas.dark,
    card: '#1C1C1C',
    border: '#2E2E2C',
    tint: tintDark,
    onTint: '#1C1C1C',
    primary: '#FCFBF8',
    onPrimary: '#1C1C1C',
    tabIconDefault: '#85827E',
    tabIconSelected: tintDark,
    success: '#6FBF7E',
    danger: '#FF6B63',
    muted: '#272725',
    tintMuted: '#2A2218',
  },
};

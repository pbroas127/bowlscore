// The only source of color, type, radius and spacing. Screens never hardcode these.
import { Platform, type TextStyle } from 'react-native'

export const color = {
  bg: '#FFF8EC',
  surface: '#FFFFFF',
  ink: '#231F1A',
  ink2: '#6B6358',
  ink3: '#A39A8C',
  hairline: '#EFE6D6',
  yellow: '#FFC93C',
  yellowEdge: '#E0A800',
  yellowSoft: '#FFF0C2',
  green: '#22B866',
  greenSoft: '#E3F6EB',
  excellent: '#22B866',
  good: '#8CCB3F',
  poor: '#F5862E',
  bad: '#E5484D',
  badSoft: '#FDECEC',
  scanChrome: '#14110D',
} as const

export const radius = { chip: 12, card: 20, sheet: 28, pill: 999 } as const
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 12: 48 } as const
export const gutter = 20

export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  heading: 'BricolageGrotesque_700Bold',
  text: 'DMSans_400Regular',
  textMedium: 'DMSans_500Medium',
  textBold: 'DMSans_600SemiBold',
} as const

const t = (fontFamily: string, fontSize: number, lineHeight: number, extra: TextStyle = {}): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight,
  color: color.ink,
  ...extra,
})

export const type = {
  display: t(font.display, 40, 44, { letterSpacing: -0.8 }),
  h1: t(font.heading, 28, 34, { letterSpacing: -0.5 }),
  h2: t(font.heading, 22, 28, { letterSpacing: -0.3 }),
  title: t(font.textBold, 17, 22),
  body: t(font.text, 17, 24),
  label: t(font.textMedium, 15, 20),
  caption: t(font.text, 13, 18, { color: color.ink2 }),
  score: t(font.display, 64, 64, { fontVariant: ['tabular-nums'], letterSpacing: -2 }),
} as const

// One shadow token, warm not grey. Only for floating layers.
export const shadow = Platform.select({
  web: { boxShadow: '0 6px 20px rgba(90, 62, 0, 0.08)' },
  default: { shadowColor: '#5A3E00', shadowOpacity: 0.08, shadowOffset: { width: 0, height: 6 }, shadowRadius: 20, elevation: 4 },
}) as object

export const spring = { damping: 18, stiffness: 220 } as const

export type Grade = 'Excellent' | 'Good' | 'Poor' | 'Bad'
export const gradeFor = (score: number): Grade => (score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Poor' : 'Bad')
export const gradeColor = (score: number) => ({ Excellent: color.excellent, Good: color.good, Poor: color.poor, Bad: color.bad })[gradeFor(score)]

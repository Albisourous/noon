import { Easing } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#14121f',
  card: '#241f33',
  chip: 'rgba(242,239,230,0.07)',
  border: 'rgba(242,239,230,0.10)',
  text: '#f2efe6',
  secondary: '#9a93a8',
  muted: '#6e6780',
  accent: '#a3a0e8',
  accentSoft: 'rgba(163,160,232,0.14)',
  accentSoftStrong: 'rgba(163,160,232,0.24)',
  accentBorder: 'rgba(163,160,232,0.45)',
  accentWarm: '#f0b86e',
  accentWarmSoft: 'rgba(240,184,110,0.16)',
  poor: '#b98a94',
  poorSoft: 'rgba(185,138,148,0.16)',
  success: '#8fb894',
  danger: '#c9939b',
  onAccent: '#191630',
  scrim: 'rgba(20,18,31,0.72)',
} as const;

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 } as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const layout = {
  screenTop: 64,
  listBottom: 120,
  rankWidth: 36,
  skeletonHeight: 58,
  formMaxWidth: 320,
  hintMaxWidth: 260,
  emptyTop: 88,
  badgePadX: 10,
  badgePadY: 4,
  scoreBarHeight: 6,
} as const;

export const opacity = {
  disabled: 0.5,
  pressed: 0.7,
  busy: 0.6,
  pulseMin: 0.35,
} as const;

export const motion = {
  pressScale: 0.96,
  pressSpring: { friction: 5, tension: 300, useNativeDriver: true },
  breatheLoop: {
    half: 1200,
    from: 0.35,
    to: 1,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
  },
  floatLoop: {
    half: 1500,
    distance: 4,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: true,
  },
  enter: {
    duration: 300,
    rise: 8,
    stagger: 45,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: true,
  },
  scoreReveal: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
    useNativeDriver: false,
  },
  listChange: 'easeInEaseOut',
  statusTtl: 5000,
} as const;

export const screen: ViewStyle = {
  flex: 1,
  backgroundColor: colors.bg,
  paddingTop: layout.screenTop,
  paddingHorizontal: spacing.lg,
};

export const font = {
  eyebrow: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: { color: colors.text, fontSize: 30, fontWeight: '700' },
  display: { color: colors.text, fontSize: 40, fontWeight: '800' },
  subtitle: { color: colors.secondary, fontSize: 17, fontWeight: '600' },
  body: { color: colors.text, fontSize: 16, fontWeight: '400' },
  bodyStrong: { color: colors.text, fontSize: 16, fontWeight: '600' },
  bodySm: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodySmStrong: { color: colors.text, fontSize: 15, fontWeight: '700' },
  bodySmHeavy: { color: colors.secondary, fontSize: 15, fontWeight: '900' },
  caption: { color: colors.secondary, fontSize: 13, fontWeight: '500' },
  label: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  hint: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  badge: { color: colors.secondary, fontSize: 11, fontWeight: '600' },
  score: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  button: { color: colors.onAccent, fontSize: 17, fontWeight: '700' },
} satisfies Record<string, TextStyle>;

export const glow = {
  accentSoftGlow: {
    shadowColor: colors.accent,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  warmGlow: {
    shadowColor: colors.accentWarm,
    shadowOpacity: 0.3,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
} satisfies Record<string, ViewStyle>;

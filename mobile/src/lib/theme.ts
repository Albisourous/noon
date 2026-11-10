import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#0a0a0f',
  card: '#1a1a24',
  accent: '#5b6cff',
  text: '#ffffff',
  secondary: '#888888',
  muted: '#666666',
  success: '#2fbf71',
  danger: '#ff6b6b',
} as const;

export const radius = { sm: 8, md: 12, lg: 14 } as const;

export const screen: ViewStyle = {
  flex: 1,
  backgroundColor: colors.bg,
  paddingTop: 64,
  paddingHorizontal: 20,
};

export const font = {
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  } satisfies TextStyle,
};

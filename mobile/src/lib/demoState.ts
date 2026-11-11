// Dev-only state override for screenshots. Inert in production:
// __DEV__ is false in release bundles, so DEMO_STATE is always 'default'.
// Flip this const (or set EXPO_PUBLIC_DEMO_STATE before starting Metro) to
// render states the demo data cannot reach (onboarding gate, empty board,
// missed rows, skeletons, long board for tab-bar scroll).
type DemoState =
  | 'default'
  | 'empty'
  | 'missed'
  | 'long'
  | 'onboarding'
  | 'loading';

const RAW: DemoState = 'default';

export const DEMO_STATE: DemoState = __DEV__
  ? ((process.env.EXPO_PUBLIC_DEMO_STATE as DemoState | undefined) ?? RAW)
  : 'default';

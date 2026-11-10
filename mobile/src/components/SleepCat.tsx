import LottieView from 'lottie-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

// Source animation is 1920x1080, 180f @ 30fps (6s). Speed 1.8 brings the
// breath cycle to ~3.3s, inside the app's 1.2–3s ambient rhythm.
const CAT_ASPECT = 1080 / 1920;
const BREATH_SPEED = 1.8;

export function SleepCat({ size = 140, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <LottieView
      source={require('../../assets/lottie/sleeping-cat.json')}
      autoPlay
      loop
      speed={BREATH_SPEED}
      style={[{ width: size, height: size * CAT_ASPECT }, style]}
    />
  );
}

import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { motion } from '../lib/theme';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
};

export default function PressableScale({
  onPress,
  disabled,
  style,
  children,
  accessibilityRole = 'button',
  accessibilityLabel,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, {
      toValue: motion.pressScale,
      ...motion.pressSpring,
    }).start();
  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      ...motion.pressSpring,
    }).start();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, layout, motion, opacity, radius, spacing } from '../lib/theme';

export function SkeletonRows({ count = 3 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(opacity.pulseMin)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: motion.breatheLoop.to,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
        Animated.timing(pulse, {
          toValue: motion.breatheLoop.from,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Animated.View key={i} style={[styles.row, { opacity: pulse }]} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    height: layout.skeletonHeight,
  },
});

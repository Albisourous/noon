import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../lib/theme';

export function SkeletonRows({ count = 3 }: { count?: number }) {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
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
    marginTop: 8,
    height: 58,
  },
});

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, font, layout, motion, radius, spacing } from '../lib/theme';
import { SleepCat } from './SleepCat';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: motion.breatheLoop.from,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
        Animated.timing(breathe, {
          toValue: motion.breatheLoop.to,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  return (
    <View style={styles.wrap}>
      <SleepCat size={110} style={styles.cat} />
      <Animated.View style={[styles.dot, { opacity: breathe }]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingTop: layout.emptyTop,
    paddingHorizontal: spacing.xl,
  },
  cat: {
    marginBottom: spacing.sm,
  },
  dot: {
    width: layout.emptyDotSize,
    height: layout.emptyDotSize,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginBottom: spacing.lg,
  },
  title: { ...font.subtitle },
  hint: {
    ...font.hint,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: layout.hintMaxWidth,
  },
});

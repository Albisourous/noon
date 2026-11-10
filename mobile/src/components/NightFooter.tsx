import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, font, layout, motion, radius, spacing } from '../lib/theme';

export default function NightFooter() {
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
    <View style={styles.nightFooter}>
      <Animated.View style={[styles.nightDot, { opacity: breathe }]} />
      <Text style={styles.nightCaption}>the night is young</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  nightFooter: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  nightDot: {
    width: layout.voidDotSize,
    height: layout.voidDotSize,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  nightCaption: { ...font.caption },
});

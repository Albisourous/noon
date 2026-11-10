import { StyleSheet, Text, View } from 'react-native';
import { colors, font, layout, radius } from '../lib/theme';

export function Badge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'accent' | 'warm';
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'accent' && styles.badgeAccent,
        tone === 'warm' && styles.badgeWarm,
      ]}
    >
      <Text
        style={[
          styles.text,
          tone === 'accent' && styles.textAccent,
          tone === 'warm' && styles.textWarm,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingHorizontal: layout.badgePadX,
    paddingVertical: layout.badgePadY,
  },
  badgeAccent: { backgroundColor: colors.accentSoft },
  badgeWarm: { backgroundColor: colors.accentWarmSoft },
  text: { ...font.badge },
  textAccent: { color: colors.accent },
  textWarm: { color: colors.accentWarm },
});

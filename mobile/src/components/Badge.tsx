import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';

export function Badge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'accent';
}) {
  return (
    <View style={[styles.badge, tone === 'accent' && styles.badgeAccent]}>
      <Text style={[styles.text, tone === 'accent' && styles.textAccent]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.chip,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeAccent: { backgroundColor: colors.accentSoft },
  text: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  textAccent: { color: colors.accent },
});

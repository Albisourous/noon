import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../lib/theme';

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
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
  text: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
});

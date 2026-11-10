import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../lib/theme';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingTop: 88, paddingHorizontal: 24 },
  title: { color: colors.secondary, fontSize: 17, fontWeight: '600' },
  hint: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 260,
  },
});

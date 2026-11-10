import { StyleSheet, Text, View } from 'react-native';
import { font, layout, spacing } from '../lib/theme';

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.wrap}>
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
  title: { ...font.subtitle },
  hint: {
    ...font.hint,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: layout.hintMaxWidth,
  },
});

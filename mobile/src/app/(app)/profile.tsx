import { useEffect, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PressableScale from '../../components/PressableScale';
import { fetchMyProfile, setHandle } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import {
  colors,
  font,
  layout,
  radius,
  screen,
  spacing,
} from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';

export default function Profile() {
  const [handle, setHandleValue] = useState('');
  const [email, setEmail] = useState('');
  const [tz, setTz] = useState('');
  const [status, flashStatus, setStatus] = useFlashStatus();
  const [handleFocused, setHandleFocused] = useState(false);

  useEffect(() => {
    (async () => {
      const [profile, user] = await Promise.all([
        fetchMyProfile(),
        supabase.auth.getUser(),
      ]);
      setHandleValue(profile?.handle ?? '');
      setTz(profile?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
      setEmail(user.data.user?.email ?? '');
    })();
  }, []);

  async function saveHandle() {
    setStatus('');
    const { error } = await setHandle(handle);
    flashStatus(error ? error.message : 'Saved.');
  }

  return (
    <View style={screen}>
      <Text style={styles.eyebrow}>About you</Text>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, handleFocused && styles.inputFocused]}
            placeholder="yourhandle"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={saveHandle}
            onFocus={() => setHandleFocused(true)}
            onBlur={() => setHandleFocused(false)}
            value={handle}
            onChangeText={setHandleValue}
          />
          <PressableScale
            accessibilityRole="button"
            style={styles.saveButton}
            onPress={saveHandle}
          >
            <Text style={styles.saveText}>Save</Text>
          </PressableScale>
        </View>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>email</Text>
          <Text style={styles.value}>{email || '—'}</Text>
        </View>
        <View style={styles.separator} />
        <View style={styles.infoRow}>
          <Text style={styles.label}>timezone</Text>
          <Text style={styles.value}>{tz}</Text>
        </View>
      </View>

      <PressableScale
        accessibilityRole="button"
        style={[styles.card, styles.signOutCard]}
        onPress={() =>
          Alert.alert('Sign out?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Sign Out',
              style: 'destructive',
              onPress: () => supabase.auth.signOut(),
            },
          ])
        }
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...font.eyebrow, marginBottom: spacing.xs },
  title: { ...font.title, marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  separator: {
    height: layout.hairline,
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
  },
  label: { ...font.bodySm, color: colors.secondary },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    ...font.body,
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: { borderColor: colors.accent },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  saveText: { ...font.button },
  status: {
    color: colors.secondary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  value: { ...font.bodySm },
  signOutCard: { alignItems: 'center', padding: spacing.lg },
  signOutText: { ...font.bodyStrong, color: colors.danger },
});

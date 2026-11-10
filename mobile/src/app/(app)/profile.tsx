import { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchMyProfile, setHandle } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { colors, font, radius, screen } from '../../lib/theme';

export default function Profile() {
  const [handle, setHandleValue] = useState('');
  const [email, setEmail] = useState('');
  const [tz, setTz] = useState('');
  const [status, setStatus] = useState('');
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
    setStatus(error ? error.message : 'Saved.');
  }

  return (
    <View style={screen}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, handleFocused && styles.inputFocused]}
            placeholder="yourhandle"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={saveHandle}
            onFocus={() => setHandleFocused(true)}
            onBlur={() => setHandleFocused(false)}
            value={handle}
            onChangeText={setHandleValue}
          />
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={saveHandle}
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
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

      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.signOutCard,
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...font.title, marginBottom: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.chip,
    marginHorizontal: 4,
  },
  label: { color: colors.muted, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: { borderColor: colors.accent },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveText: { color: colors.text, fontWeight: '700' },
  status: { color: colors.secondary, marginTop: 8, marginLeft: 4 },
  value: { color: colors.text, fontSize: 15 },
  signOutCard: { alignItems: 'center', padding: 16 },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});

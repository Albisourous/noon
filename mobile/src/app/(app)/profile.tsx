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

      <Text style={styles.label}>handle</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="yourhandle"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          value={handle}
          onChangeText={setHandleValue}
        />
        <Pressable style={styles.saveButton} onPress={saveHandle}>
          <Text style={styles.saveText}>Save</Text>
        </Pressable>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Text style={styles.label}>email</Text>
      <Text style={styles.value}>{email}</Text>

      <Text style={styles.label}>timezone</Text>
      <Text style={styles.value}>{tz}</Text>

      <Pressable style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...font.title, marginBottom: 24 },
  label: { color: colors.muted, fontSize: 13, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveText: { color: colors.text, fontWeight: '700' },
  status: { color: colors.secondary, marginTop: 8 },
  value: { color: colors.text, fontSize: 16 },
  signOut: {
    marginTop: 48,
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '700' },
});

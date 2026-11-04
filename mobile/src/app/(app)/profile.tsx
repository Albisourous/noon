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
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <Text style={styles.label}>handle</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="yourhandle"
          placeholderTextColor="#666"
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
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 24 },
  label: { color: '#666', fontSize: 13, marginTop: 16, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#1a1a24',
    color: '#fff',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#5b6cff',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700' },
  status: { color: '#888', marginTop: 8 },
  value: { color: '#fff', fontSize: 16 },
  signOut: {
    marginTop: 48,
    borderColor: '#ff6b6b',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#ff6b6b', fontWeight: '700' },
});

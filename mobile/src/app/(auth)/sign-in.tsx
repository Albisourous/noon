import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function sendOtp() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else setStage('otp');
  }

  async function verifyOtp() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Napking</Text>
      <Text style={styles.subtitle}>Sleep. Score. Compete.</Text>

      {stage === 'email' ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Pressable style={styles.button} onPress={sendOtp} disabled={busy}>
            <Text style={styles.buttonText}>
              {busy ? 'Sending…' : 'Send code'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.hint}>Code sent to {email}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor="#666"
            keyboardType="number-pad"
            value={otp}
            onChangeText={setOtp}
          />
          <Pressable style={styles.button} onPress={verifyOtp} disabled={busy}>
            <Text style={styles.buttonText}>
              {busy ? 'Verifying…' : 'Verify'}
            </Text>
          </Pressable>
        </View>
      )}

      {message ? <Text style={styles.error}>{message}</Text> : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: '#fff', fontSize: 42, fontWeight: '800' },
  subtitle: { color: '#888', fontSize: 16, marginTop: 8, marginBottom: 48 },
  form: { width: '100%', maxWidth: 320 },
  hint: { color: '#888', marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: '#1a1a24',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#5b6cff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  error: { color: '#ff6b6b', marginTop: 16 },
});

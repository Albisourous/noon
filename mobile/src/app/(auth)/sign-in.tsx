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
import { colors, radius } from '../../lib/theme';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState('');

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
      <Text style={styles.title}>Sleeple</Text>
      <Text style={styles.subtitle}>Sleep. Score. Compete.</Text>

      {stage === 'email' ? (
        <View style={styles.form}>
          <TextInput
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            autoFocus
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            value={email}
            onChangeText={setEmail}
          />
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 },
            ]}
            onPress={sendOtp}
            disabled={busy}
          >
            <Text style={styles.buttonText}>
              {busy ? 'Sending…' : 'Send code'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.hint}>Code sent to {email}</Text>
          <TextInput
            style={[styles.input, focused === 'otp' && styles.inputFocused]}
            placeholder="123456"
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            autoFocus
            onFocus={() => setFocused('otp')}
            onBlur={() => setFocused('')}
            value={otp}
            onChangeText={setOtp}
          />
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && { opacity: 0.7 },
            ]}
            onPress={verifyOtp}
            disabled={busy}
          >
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
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { color: colors.text, fontSize: 42, fontWeight: '800' },
  subtitle: { color: colors.secondary, fontSize: 16, marginTop: 8, marginBottom: 48 },
  form: { width: '100%', maxWidth: 320 },
  hint: { color: colors.secondary, marginBottom: 12, textAlign: 'center' },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: { borderColor: colors.accent },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  error: { color: colors.danger, marginTop: 16 },
});

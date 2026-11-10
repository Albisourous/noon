import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import PressableScale from '../../components/PressableScale';
import { DEMO_STATE } from '../../lib/demoState';
import { supabase } from '../../lib/supabase';
import {
  colors,
  font,
  layout,
  opacity,
  radius,
  spacing,
} from '../../lib/theme';

export default function SignIn() {
  const [email, setEmail] = useState(
    DEMO_STATE === 'otp' ? 'friend@example.com' : '',
  );
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState<'email' | 'otp'>(
    DEMO_STATE === 'otp' ? 'otp' : 'email',
  );
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
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            autoFocus
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused('')}
            value={email}
            onChangeText={setEmail}
          />
          <PressableScale
            accessibilityRole="button"
            style={[
              styles.button,
              !email.trim() && { opacity: opacity.disabled },
            ]}
            onPress={sendOtp}
            disabled={busy || !email.trim()}
          >
            <View style={styles.buttonInner}>
              {busy ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : null}
              <Text style={styles.buttonText}>
                {busy ? 'Sending…' : 'Send code'}
              </Text>
            </View>
          </PressableScale>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.eyebrow}>check your email</Text>
          <Text style={styles.hint}>Code sent to {email}</Text>
          <TextInput
            style={[styles.input, focused === 'otp' && styles.inputFocused]}
            placeholder="123456"
            placeholderTextColor={colors.secondary}
            keyboardType="number-pad"
            autoFocus
            onFocus={() => setFocused('otp')}
            onBlur={() => setFocused('')}
            value={otp}
            onChangeText={setOtp}
          />
          <PressableScale
            accessibilityRole="button"
            style={[
              styles.button,
              !otp.trim() && { opacity: opacity.disabled },
            ]}
            onPress={verifyOtp}
            disabled={busy || !otp.trim()}
          >
            <View style={styles.buttonInner}>
              {busy ? (
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : null}
              <Text style={styles.buttonText}>
                {busy ? 'Verifying…' : 'Verify'}
              </Text>
            </View>
          </PressableScale>
          <PressableScale
            accessibilityRole="button"
            style={styles.ghostButton}
            onPress={() => {
              setStage('email');
              setOtp('');
              setMessage('');
            }}
          >
            <Text style={styles.ghostText}>Use a different email</Text>
          </PressableScale>
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
    padding: spacing.xl,
  },
  title: { ...font.display },
  subtitle: {
    ...font.body,
    color: colors.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl + spacing.lg,
  },
  form: { width: '100%', maxWidth: layout.formMaxWidth },
  eyebrow: {
    ...font.eyebrow,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  hint: {
    color: colors.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  input: {
    ...font.body,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: { borderColor: colors.accent },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonText: { ...font.button },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  error: { color: colors.danger, marginTop: spacing.lg },
  ghostButton: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  ghostText: { ...font.label },
});

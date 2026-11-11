import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  checkIn,
  fetchEntry,
  fetchMyProfile,
  fetchPrevScored,
  localDateString,
  setHandle,
  type StoredEntry,
} from '../../lib/api';
import { DEMO_STATE } from '../../lib/demoState';
import { ensureSleepPermission, getSleepState } from '../../lib/sleep';
import { scheduleNoonReminder } from '../../lib/notifications';
import {
  colors,
  font,
  motion,
  opacity,
  radius,
  screen,
  spacing,
  typeface,
} from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';
import PressableScale from '../../components/PressableScale';
import { SleepCat } from '../../components/SleepCat';
import SleepBoard from '../../../widgets/SleepBoardWidget';

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function dateLabel(iso: string, today: string): string {
  if (iso === today) return 'today';
  const d = new Date(`${iso}T12:00:00`);
  return d
    .toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toLowerCase();
}

// Short label for the delta line: 'yesterday' when adjacent, weekday
// otherwise.
function dayName(iso: string): string {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString(undefined, { weekday: 'long' })
    .toLowerCase();
}

function fmtTime(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    .toLowerCase();
}

function fmtHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

type Band = 'excellent' | 'normal' | 'poor' | null;

function bandFor(entry: StoredEntry | null): Band {
  if (!entry || entry.score === null) return null;
  return entry.score > 85 ? 'excellent' : entry.score >= 70 ? 'normal' : 'poor';
}

const bandColor: Record<Exclude<Band, null>, string> = {
  excellent: colors.accentWarm,
  normal: colors.accent,
  poor: colors.poor,
};

type SessionState = 'none' | 'still_asleep' | null;

export default function Home() {
  const today = localDateString();
  const [date, setDate] = useState(today);
  const [entry, setEntry] = useState<StoredEntry | null>(null);
  const [prev, setPrev] = useState<StoredEntry | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [needsHandle, setNeedsHandle] = useState<boolean | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [handleFocused, setHandleFocused] = useState(false);
  const [healthLinked, setHealthLinked] = useState(false);
  const [status, flashStatus] = useFlashStatus();

  // Animated values live in state initializers, not useRef — reading a
  // ref during render trips the react-hooks/refs lint rule.
  const [scoreAnim] = useState(() => new Animated.Value(0));
  const [heroScale] = useState(() => new Animated.Value(1));
  const [breathe] = useState(() => new Animated.Value(motion.breatheLoop.from));
  const [tx] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(0));
  const [metricAnims] = useState(() =>
    [0, 1, 2].map(() => new Animated.Value(0)),
  );
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const revealed = useRef(false);
  const sliding = useRef(false);

  const reading = loadedFor !== date;

  const load = useCallback(
    async (d: string) => {
      try {
        let e = await fetchEntry(d);
        const [profile, p] = await Promise.all([
          fetchMyProfile(),
          fetchPrevScored(d),
        ]);
        let state: SessionState = null;
        // Silent check-in: no stored entry for today means the app reads
        // HealthKit itself and posts the score without a button.
        if (!e && d === today && DEMO_STATE === 'default') {
          const s = await getSleepState();
          if (s.kind === 'session') {
            await checkIn(s.session);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            e = await fetchEntry(d);
          } else if (s.kind !== 'unavailable') {
            state = s.kind;
          }
        }
        setEntry(e);
        setPrev(p);
        setSessionState(state);
        setNeedsHandle(profile?.handle == null);
        // Mirror the day onto the home-screen widget. Best-effort: the
        // widget module is absent in runtimes without a dev build.
        try {
          SleepBoard.updateSnapshot({
            wake_date: d,
            rows: [
              {
                handle: profile?.handle ?? 'me',
                score: e?.score ?? null,
                status: e?.status ?? null,
                confidence: e?.confidence ?? null,
                isSelf: true,
              },
            ],
          });
        } catch {
          // widget module absent in runtimes without a dev build
        }
      } catch (err) {
        flashStatus(String(err));
      } finally {
        setLoadedFor(d);
      }
    },
    [today, flashStatus],
  );

  useEffect(() => {
    const t = setTimeout(() => void load(date), 0);
    return () => clearTimeout(t);
  }, [date, load]);

  // Content enter/exit for day changes. tx/fade drive the slide.
  const goDay = useCallback(
    (dir: 1 | -1) => {
      if (sliding.current || (dir === 1 && date === today)) return;
      sliding.current = true;
      Haptics.selectionAsync();
      Animated.timing(tx, {
        toValue: dir * 24,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        tx.setValue(-dir * 24);
        setDate(shiftDate(date, dir));
        Animated.timing(tx, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          sliding.current = false;
        });
      });
    },
    [date, today, tx],
  );

  // Horizontal swipe to change day. Page-x deltas only; refs stay inside
  // handlers, which the refs lint rule allows.
  const touchX = useRef<number | null>(null);

  const band = bandFor(entry);

  // Score reveal: count up on the first scored view of the day; other
  // days arrive with the slide instead of re-counting.
  useEffect(() => {
    const sub = scoreAnim.addListener(({ value }) =>
      setDisplayScore(Math.round(value)),
    );
    if (!entry || entry.score === null) {
      return () => scoreAnim.removeListener(sub);
    }
    const isLiveReveal = date === today && !revealed.current;
    if (!isLiveReveal) {
      scoreAnim.setValue(entry.score);
      return () => scoreAnim.removeListener(sub);
    }
    revealed.current = true;
    scoreAnim.setValue(0);
    Animated.timing(scoreAnim, {
      toValue: entry.score,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      Animated.sequence([
        Animated.timing(heroScale, {
          toValue: 1.05,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(heroScale, {
          toValue: 1,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => scoreAnim.removeListener(sub);
  }, [entry, date, today, scoreAnim, heroScale]);


  // Metrics + content fade stagger in after the hero settles.
  useEffect(() => {
    if (reading) return;
    fade.setValue(0);
    metricAnims.forEach((a) => a.setValue(0));
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.stagger(
        motion.enter.stagger,
        metricAnims.map((a) =>
          Animated.timing(a, {
            toValue: 1,
            duration: motion.enter.duration,
            easing: motion.enter.easing,
            useNativeDriver: true,
          }),
        ),
      ),
    ]).start();
  }, [reading, entry, fade, metricAnims]);

  // Breathing dot while reading.
  useEffect(() => {
    if (!reading) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: motion.breatheLoop.to,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
        Animated.timing(breathe, {
          toValue: motion.breatheLoop.from,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reading, breathe]);

  if (needsHandle) {
    return (
      <View style={screen}>
        <SleepCat
          size={140}
          style={{ alignSelf: 'center', marginBottom: spacing.lg }}
        />
        <Text style={styles.eyebrow}>getting started</Text>
        <Text style={styles.title}>Welcome to Sleeple</Text>
        <Text style={styles.onboardHint}>
          One score a day. Set your handle so friends can find you, then
          connect Apple Health.
        </Text>
        <TextInput
          style={[styles.input, handleFocused && styles.inputFocused]}
          placeholder="pick a handle"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onFocus={() => setHandleFocused(true)}
          onBlur={() => setHandleFocused(false)}
          value={handleInput}
          onChangeText={setHandleInput}
        />
        <PressableScale
          accessibilityRole="button"
          style={[
            styles.checkinButton,
            !handleInput.trim() && { opacity: opacity.disabled },
          ]}
          disabled={!handleInput.trim()}
          onPress={async () => {
            const { error } = await setHandle(handleInput);
            if (error) {
              flashStatus(error.message);
              return;
            }
            const granted = await ensureSleepPermission();
            setHealthLinked(granted);
            await scheduleNoonReminder();
            setNeedsHandle(false);
          }}
        >
          <Text style={styles.checkinText}>
            {healthLinked ? 'Connected — continue' : 'Save & connect Health'}
          </Text>
        </PressableScale>
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    );
  }

  const delta =
    entry?.score != null && prev?.score != null
      ? entry.score - prev.score
      : null;
  const deltaLabel =
    delta === null
      ? ''
      : delta === 0
        ? `even with ${prev && shiftDate(prev.wake_date, 1) === date ? 'yesterday' : dayName(prev!.wake_date)}`
        : `${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} from ${
            prev && shiftDate(prev.wake_date, 1) === date
              ? 'yesterday'
              : dayName(prev!.wake_date)
          }`;

  const efficiency =
    entry?.asleep_min != null && entry?.inbed_min
      ? Math.round((entry.asleep_min / entry.inbed_min) * 100)
      : null;

  const metricRows: { value: string; anim: Animated.Value }[] = [];
  if (entry?.status === 'scored') {
    if (entry.asleep_min != null)
      metricRows.push({
        value: `${fmtHours(entry.asleep_min)} asleep`,
        anim: metricAnims[0],
      });
    if (entry.start && entry.end)
      metricRows.push({
        value: `${fmtTime(entry.start)} to ${fmtTime(entry.end)}`,
        anim: metricAnims[1],
      });
    if (efficiency != null)
      metricRows.push({
        value: `${efficiency}% efficient${
          entry.awakenings != null ? `, ${entry.awakenings} wake-ups` : ''
        }`,
        anim: metricAnims[2],
      });
  }

  return (
    <View
      style={screen}
      onTouchStart={(e) => {
        touchX.current = e.nativeEvent.pageX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.nativeEvent.pageX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) goDay(dx < 0 ? 1 : -1);
      }}
    >
      <Text style={styles.date}>{dateLabel(date, today)}</Text>

      <Animated.View
        style={[
          styles.hero,
          { opacity: reading ? 1 : fade, transform: [{ translateX: tx }] },
        ]}
      >
        {reading ? (
          <View style={styles.readingWrap}>
            <Animated.View style={[styles.dot, { opacity: breathe }]} />
            <Text style={styles.stateText}>reading last night</Text>
          </View>
        ) : entry?.status === 'missed' ? (
          <Text style={styles.missedHero}>missed</Text>
        ) : entry?.score != null ? (
          <>
            <Animated.Text
              style={[
                styles.heroScore,
                { color: band ? bandColor[band] : colors.text },
                band === 'excellent' && {
                  textShadowColor: colors.accentWarm,
                  textShadowRadius: 28,
                  textShadowOffset: { width: 0, height: 0 },
                },
                { transform: [{ scale: heroScale }] },
              ]}
            >
              {entry.confidence === 'building' ? '~' : ''}
              {displayScore ?? entry.score}
            </Animated.Text>
            <Text style={styles.heroCaption}>sleep score</Text>
            {deltaLabel ? (
              <Text
                style={[
                  styles.delta,
                  delta! > 0 && { color: colors.success },
                  delta! < 0 && { color: colors.poor },
                ]}
              >
                {deltaLabel}
              </Text>
            ) : null}
          </>
        ) : (
          <View style={styles.readingWrap}>
            <Text style={styles.stateText}>
              {sessionState === 'still_asleep'
                ? 'still asleep'
                : date === today
                  ? 'no sleep recorded'
                  : 'no entry'}
            </Text>
            {date === today && sessionState === 'none' ? (
              <PressableScale
                accessibilityRole="button"
                onPress={async () => {
                  await checkIn('missed');
                  await load(date);
                }}
              >
                <Text style={styles.missedLink}>record a missed day</Text>
              </PressableScale>
            ) : null}
          </View>
        )}

        {metricRows.map((row, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.metric,
              {
                opacity: row.anim,
                transform: [
                  {
                    translateY: row.anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [motion.enter.rise, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {row.value}
          </Animated.Text>
        ))}
      </Animated.View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  date: { ...font.eyebrow, textAlign: 'center' },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingWrap: { alignItems: 'center', gap: spacing.md },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  stateText: { ...font.label },
  missedLink: {
    ...font.label,
    color: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  heroScore: {
    fontSize: 112,
    fontFamily: typeface.extrabold,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  heroCaption: { ...font.eyebrow, marginTop: spacing.xs },
  delta: { ...font.label, marginTop: spacing.sm },
  missedHero: {
    ...font.display,
    color: colors.secondary,
  },
  metric: {
    ...font.bodySm,
    color: colors.secondary,
    fontVariant: ['tabular-nums'],
    marginTop: spacing.md,
  },
  eyebrow: { ...font.eyebrow, marginBottom: spacing.xs },
  title: { ...font.title, marginBottom: spacing.xl },
  onboardHint: {
    ...font.bodySm,
    color: colors.secondary,
    marginBottom: spacing.xl,
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
  checkinButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkinText: { ...font.button },
  status: {
    ...font.caption,
    alignSelf: 'center',
    backgroundColor: colors.chip,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
});

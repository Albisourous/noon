import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Share,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { checkIn, fetchBoard, fetchMyProfile, localDateString, setHandle } from '../../lib/api';
import { ensureSleepPermission, getSleepState } from '../../lib/sleep';
import { scheduleNoonReminder } from '../../lib/notifications';
import { isConfigured, supabase } from '../../lib/supabase';
import {
  colors,
  font,
  glow,
  gradients,
  layout,
  motion,
  opacity,
  radius,
  screen,
  spacing,
} from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';
import type { BoardRow, SleepSession } from '../../lib/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import NightFooter from '../../components/NightFooter';
import PressableScale from '../../components/PressableScale';
import { SkeletonRows } from '../../components/SkeletonRows';

export default function Board() {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [myId, setMyId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, flashStatus, setStatus] = useFlashStatus();
  const [needsHandle, setNeedsHandle] = useState<boolean | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [healthLinked, setHealthLinked] = useState(false);
  const [handleFocused, setHandleFocused] = useState(false);
  const today = localDateString();
  const displayDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const load = useCallback(async () => {
    try {
      const [{ data: userData }, board, profile] = await Promise.all([
        supabase.auth.getUser(),
        fetchBoard(today),
        fetchMyProfile(),
      ]);
      setMyId(userData.user?.id ?? profile?.id ?? '');
      setNeedsHandle(profile?.handle == null);
      setRows(
        [...board].sort((a, b) =>
          a.score === null && b.score === null
            ? 0
            : a.score === null
              ? 1
              : b.score === null
                ? -1
                : b.score - a.score,
        ),
      );
    } catch (e) {
      flashStatus(String(e));
    } finally {
      setLoaded(true);
    }
  }, [today, flashStatus]);

  useEffect(() => {
    load();
  }, [load]);

  async function postCheckIn(payload: SleepSession | 'missed') {
    const result = await checkIn(payload);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (result.status === 'missed') {
      flashStatus(
        result.already_posted
          ? `Already posted for ${result.wake_date}`
          : `Missed day recorded for ${result.wake_date}`,
      );
    } else {
      flashStatus(
        result.already_posted
          ? `Already posted for ${result.wake_date}: ${result.score}`
          : `Score ${result.score} posted for ${result.wake_date}`,
      );
    }
    await load();
  }

  async function onCheckIn() {
    setBusy(true);
    setStatus('');
    try {
      if (!isConfigured) {
        await postCheckIn({
          start: '',
          end: '',
          asleepMin: 0,
          inBedMin: 0,
          awakenings: 0,
          staged: false,
        });
        return;
      }
      const state = await getSleepState();
      switch (state.kind) {
        case 'unavailable':
          Alert.alert(
            'Health access needed',
            'Allow sleep data access in Settings to check in.',
          );
          return;
        case 'still_asleep':
          Alert.alert(
            'Still asleep?',
            'Your latest sleep session may still be in progress. Check in after you wake up so a partial night is not posted.',
          );
          return;
        case 'none':
          Alert.alert(
            'No sleep found',
            'No completed sleep session in the last 36 hours. Record a missed day?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Record missed',
                onPress: () =>
                  postCheckIn('missed').catch((e) => flashStatus(String(e))),
              },
            ],
          );
          return;
        case 'session':
          await postCheckIn(state.session);
          return;
      }
    } catch (e) {
      flashStatus(String(e));
    } finally {
      setBusy(false);
    }
  }

  const myRow = rows.find((r) => r.user_id === myId);
  const checkedScore = myRow?.status === 'scored' ? myRow.score : null;

  const pressScale = useRef(new Animated.Value(1)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const revealedFor = useRef<number | null>(null);

  useEffect(() => {
    if (checkedScore === null) {
      setDisplayScore(null);
      return;
    }
    if (revealedFor.current === checkedScore) {
      setDisplayScore(checkedScore);
      return;
    }
    revealedFor.current = checkedScore;
    scoreAnim.setValue(0);
    const sub = scoreAnim.addListener(({ value }) =>
      setDisplayScore(Math.round(value)),
    );
    Animated.timing(scoreAnim, {
      toValue: checkedScore,
      ...motion.scoreReveal,
    }).start(() => scoreAnim.removeListener(sub));
    return () => scoreAnim.removeListener(sub);
  }, [checkedScore, scoreAnim]);

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: motion.pressScale,
      ...motion.pressSpring,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      ...motion.pressSpring,
    }).start();

  if (needsHandle) {
    return (
      <View style={screen}>
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

  return (
    <View style={screen}>
      <Text style={styles.date}>{displayDate}</Text>
      <Text style={styles.title}>Today's Board</Text>

      <Animated.View
        style={[
          { transform: [{ scale: pressScale }] },
          myRow?.status === 'scored' && styles.checkinGlow,
        ]}
      >
        <Pressable
          accessibilityRole="button"
          style={[styles.checkinButton, busy && styles.checkinDisabled]}
          onPress={onCheckIn}
          disabled={busy}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={styles.checkinInner}>
            {busy ? (
              <ActivityIndicator color={colors.onAccent} size="small" />
            ) : null}
            <Text style={styles.checkinText}>
              {busy
                ? 'Syncing…'
                : myRow?.status === 'scored'
                  ? `Checked in — ${displayScore ?? myRow.score}`
                  : myRow?.status === 'missed'
                    ? 'Checked in — missed'
                    : 'Check in'}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
      {myRow?.status === 'scored' ? (
        <PressableScale
          accessibilityRole="button"
          style={styles.shareButton}
          onPress={() =>
            Share.share({
              message: `I scored ${myRow.score}/100 on Sleeple today. Beat my sleep tonight — add me: @${myRow.handle ?? ''}`,
            })
          }
        >
          <Text style={styles.shareText}>Share score</Text>
        </PressableScale>
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.user_id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item, index }) => (
          <BoardRowItem item={item} index={index} myId={myId} />
        )}
        ListFooterComponent={loaded ? <NightFooter /> : undefined}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              title="No friends yet"
              hint="Add friends from the Friends tab and their scores will show up here."
            />
          ) : (
            <SkeletonRows />
          )
        }
      />
    </View>
  );
}

function BoardRowItem({
  item,
  index,
  myId,
}: {
  item: BoardRow;
  index: number;
  myId: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pendingPulse = useRef(new Animated.Value(1)).current;
  const isPending = item.status !== 'missed' && item.score === null;
  const isMissed = item.status === 'missed';
  const isSelf = item.user_id === myId;
  const band =
    item.score === null
      ? null
      : item.score > 85
        ? 'excellent'
        : item.score >= 70
          ? 'normal'
          : 'poor';

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.enter.duration,
      delay: index * motion.enter.stagger,
      easing: motion.enter.easing,
      useNativeDriver: motion.enter.useNativeDriver,
    }).start();
  }, [anim, index]);

  useEffect(() => {
    if (!isPending) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pendingPulse, {
          toValue: motion.breatheLoop.from,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
        Animated.timing(pendingPulse, {
          toValue: motion.breatheLoop.to,
          duration: motion.breatheLoop.half,
          easing: motion.breatheLoop.easing,
          useNativeDriver: motion.breatheLoop.useNativeDriver,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isPending, pendingPulse]);

  return (
    <Animated.View
      style={[
        styles.row,
        isSelf && styles.rowSelf,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [motion.enter.rise, 0],
              }),
            },
          ],
        },
      ]}
    >
      {item.score !== null ? (
        band === 'excellent' ? (
          <LinearGradient
            {...gradients.excellentRow}
            style={[
              styles.rowFill,
              { width: `${Math.min(item.score, 100)}%` },
            ]}
          />
        ) : (
          <View
            style={[
              styles.rowFill,
              styles.rowFillBg,
              { width: `${Math.min(item.score, 100)}%` },
            ]}
          />
        )
      ) : null}
      <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
        {item.score === null ? '·' : `#${index + 1}`}
      </Text>
      <View style={styles.rowMain}>
        <Text style={[styles.handle, isMissed && styles.missedText]}>
          {item.handle ?? 'unnamed'}
        </Text>
        {isSelf ? <Badge label="you" tone="accent" /> : null}
        {item.late ? <Badge label="late" tone="warm" /> : null}
      </View>
      <Animated.Text
        style={[
          styles.score,
          band === 'excellent' && { color: colors.accentWarm },
          band === 'poor' && { color: colors.poor },
          isPending && styles.pending,
          isPending && { opacity: pendingPulse },
          isMissed && styles.missedText,
        ]}
      >
        {item.status === 'missed' ? (
          'missed'
        ) : item.score === null ? (
          'pending'
        ) : item.confidence === 'building' ? (
          <>
            <Text style={styles.tilde}>~</Text>
            {item.score}
          </>
        ) : (
          String(item.score)
        )}
      </Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  date: { ...font.eyebrow },
  eyebrow: { ...font.eyebrow, marginBottom: spacing.xs },
  title: { ...font.title, marginBottom: spacing.xl },
  checkinButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkinDisabled: { opacity: opacity.busy },
  shareButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  shareText: { ...font.label },
  checkinInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  checkinGlow: { borderRadius: radius.lg, ...glow.accentSoftGlow },
  checkinText: { ...font.button },
  status: {
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelf: { borderColor: colors.accentBorder },
  rowFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  rowFillBg: { backgroundColor: colors.accentSoft },
  listContent: { paddingBottom: layout.listBottom },
  rank: {
    ...font.bodySmStrong,
    color: colors.secondary,
    width: layout.rankWidth,
  },
  rankFirst: { ...font.bodySmHeavy },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  handle: { ...font.bodyStrong },
  score: { ...font.score },
  pending: { ...font.bodySm, color: colors.secondary },
  tilde: { ...font.body, color: colors.secondary },
  missedText: {
    color: colors.poor,
    textDecorationLine: 'line-through',
  },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Share,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { checkIn, fetchBoard, fetchMyProfile, localDateString, setHandle } from '../../lib/api';
import { ensureSleepPermission, getSleepState } from '../../lib/sleep';
import { scheduleNoonReminder } from '../../lib/notifications';
import { isConfigured, supabase } from '../../lib/supabase';
import { colors, font, radius, screen } from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';
import type { BoardRow, SleepSession } from '../../lib/types';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
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
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => scoreAnim.removeListener(sub));
    return () => scoreAnim.removeListener(sub);
  }, [checkedScore, scoreAnim]);

  const onPressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();
  const onPressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
      tension: 300,
    }).start();

  if (needsHandle) {
    return (
      <View style={screen}>
        <Text style={styles.title}>Welcome to Sleeple</Text>
        <Text style={styles.onboardHint}>
          One score a day. Set your handle so friends can find you, then
          connect Apple Health.
        </Text>
        <TextInput
          style={[styles.input, handleFocused && styles.inputFocused]}
          placeholder="pick a handle"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoFocus
          onFocus={() => setHandleFocused(true)}
          onBlur={() => setHandleFocused(false)}
          value={handleInput}
          onChangeText={setHandleInput}
        />
        <Pressable
          style={styles.checkinButton}
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
        </Pressable>
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
          style={[styles.checkinButton, busy && styles.checkinDisabled]}
          onPress={onCheckIn}
          disabled={busy}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
        >
          <View style={styles.checkinInner}>
            {busy ? (
              <ActivityIndicator color={colors.text} size="small" />
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
        <Pressable
          style={styles.shareButton}
          onPress={() =>
            Share.share({
              message: `I scored ${myRow.score}/100 on Sleeple today. Beat my sleep tonight.`,
            })
          }
        >
          <Text style={styles.shareText}>Share score</Text>
        </Pressable>
      ) : null}
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.user_id}
        contentContainerStyle={styles.listContent}
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

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      delay: index * 45,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  useEffect(() => {
    if (!isPending) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pendingPulse, {
          toValue: 0.45,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pendingPulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
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
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {item.score !== null ? (
        <View
          style={[
            styles.rowFill,
            { width: `${Math.min(item.score, 100)}%` },
          ]}
        />
      ) : null}
      <Text style={[styles.rank, index === 0 && styles.rankFirst]}>
        {item.score === null ? '·' : `#${index + 1}`}
      </Text>
      <View style={styles.rowMain}>
        <Text style={[styles.handle, isMissed && styles.missedText]}>
          {item.handle ?? 'unnamed'}
        </Text>
        {isSelf ? <Badge label="you" /> : null}
        {item.late ? <Badge label="late" /> : null}
      </View>
      <Animated.Text
        style={[
          styles.score,
          isPending && { color: colors.muted, opacity: pendingPulse },
          isMissed && styles.missedText,
          styles.scoreDigits,
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
  date: { color: colors.muted, fontSize: 13 },
  title: { ...font.title, marginBottom: 20 },
  checkinButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    padding: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  checkinDisabled: { opacity: 0.6 },
  shareButton: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  shareText: { color: colors.secondary, fontSize: 14, fontWeight: '600' },
  checkinInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  checkinGlow: {
    borderRadius: radius.lg,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  checkinText: { color: colors.text, fontSize: 18, fontWeight: '700' },
  status: { color: colors.secondary, textAlign: 'center', marginBottom: 8 },
  onboardHint: {
    color: colors.secondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelf: { borderColor: 'rgba(91,108,255,0.35)' },
  rowFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.accentSoft,
  },
  listContent: { paddingBottom: 120 },
  rank: { color: colors.muted, width: 36, fontSize: 15, fontWeight: '700' },
  rankFirst: { fontWeight: '900', color: colors.secondary },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  handle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  score: { color: colors.accent, fontSize: 22, fontWeight: '800' },
  scoreDigits: { fontVariant: ['tabular-nums'] },
  tilde: { color: colors.muted, fontSize: 16 },
  missedText: {
    color: colors.muted,
    textDecorationLine: 'line-through',
  },
});

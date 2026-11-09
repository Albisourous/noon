import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { supabase } from '../../lib/supabase';
import type { BoardRow, SleepSession } from '../../lib/types';

export default function Board() {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const [needsHandle, setNeedsHandle] = useState<boolean | null>(null);
  const [handleInput, setHandleInput] = useState('');
  const [healthLinked, setHealthLinked] = useState(false);
  const today = localDateString();

  const load = useCallback(async () => {
    try {
      const [{ data: userData }, board, profile] = await Promise.all([
        supabase.auth.getUser(),
        fetchBoard(today),
        fetchMyProfile(),
      ]);
      setMyId(userData.user?.id ?? '');
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
      setStatus(String(e));
    }
  }, [today]);

  useEffect(() => {
    load();
    scheduleNoonReminder();
  }, [load]);

  async function postCheckIn(payload: SleepSession | 'missed') {
    const result = await checkIn(payload);
    if (result.status === 'missed') {
      setStatus(
        result.already_posted
          ? `Already posted for ${result.wake_date}`
          : `Missed day recorded for ${result.wake_date}`,
      );
    } else {
      setStatus(
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
                  postCheckIn('missed').catch((e) => setStatus(String(e))),
              },
            ],
          );
          return;
        case 'session':
          await postCheckIn(state.session);
          return;
      }
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }

  const myRow = rows.find((r) => r.user_id === myId);

  if (needsHandle) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Sleeple</Text>
        <Text style={styles.onboardHint}>
          One score a day. Set your handle so friends can find you, then
          connect Apple Health.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="pick a handle"
          placeholderTextColor="#666"
          autoCapitalize="none"
          value={handleInput}
          onChangeText={setHandleInput}
        />
        <Pressable
          style={styles.checkinButton}
          onPress={async () => {
            const { error } = await setHandle(handleInput);
            if (error) {
              setStatus(error.message);
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
    <View style={styles.container}>
      <Text style={styles.date}>{today}</Text>
      <Text style={styles.title}>Today's Board</Text>

      <Pressable
        style={[styles.checkinButton, busy && styles.checkinDisabled]}
        onPress={onCheckIn}
        disabled={busy}
      >
        <Text style={styles.checkinText}>
          {busy
            ? 'Syncing…'
            : myRow?.status === 'scored'
              ? `Checked in — ${myRow.score}`
              : myRow?.status === 'missed'
                ? 'Checked in — missed'
                : 'Check in'}
        </Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.user_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor="#888"
          />
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>
              {item.score === null ? '·' : `#${index + 1}`}
            </Text>
            <View style={styles.rowMain}>
              <Text style={styles.handle}>
                {item.handle ?? 'unnamed'}
                {item.user_id === myId ? ' (you)' : ''}
              </Text>
              {item.late ? <Text style={styles.late}>late</Text> : null}
            </View>
            <Text style={styles.score}>
              {item.status === 'missed'
                ? 'missed'
                : item.score === null
                  ? 'pending'
                  : item.confidence === 'building'
                    ? `~${item.score}`
                    : String(item.score)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No friends yet. Add some.</Text>
        }
      />
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
  date: { color: '#666', fontSize: 13 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 20 },
  checkinButton: {
    backgroundColor: '#5b6cff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 8,
  },
  checkinDisabled: { opacity: 0.6 },
  checkinText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  status: { color: '#888', textAlign: 'center', marginBottom: 8 },
  onboardHint: {
    color: '#888',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a24',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  rank: { color: '#666', width: 36, fontSize: 15, fontWeight: '700' },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  handle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  late: { color: '#666', fontSize: 12 },
  score: { color: '#5b6cff', fontSize: 22, fontWeight: '800' },
  empty: { color: '#666', textAlign: 'center', marginTop: 40 },
});

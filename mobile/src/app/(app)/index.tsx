import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { checkIn, fetchBoard, localDateString } from '../../lib/api';
import { getLatestSleepSession } from '../../lib/sleep';
import { scheduleNoonReminder } from '../../lib/notifications';
import { supabase } from '../../lib/supabase';
import type { BoardRow } from '../../lib/types';

export default function Board() {
  const [rows, setRows] = useState<BoardRow[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState('');
  const today = localDateString();

  const load = useCallback(async () => {
    try {
      const [{ data: userData }, board] = await Promise.all([
        supabase.auth.getUser(),
        fetchBoard(today),
      ]);
      setMyId(userData.user?.id ?? '');
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

  async function onCheckIn() {
    setBusy(true);
    setStatus('');
    try {
      const session = await getLatestSleepSession();
      if (!session) {
        Alert.alert(
          'No sleep found',
          "No completed sleep session in the last 36 hours. If you're still asleep, check in after you wake up.",
        );
        return;
      }
      const result = await checkIn(session);
      setStatus(
        result.already_posted
          ? `Already posted for ${result.wake_date}: ${result.score}`
          : `Score ${result.score} posted for ${result.wake_date}`,
      );
      await load();
    } catch (e) {
      setStatus(String(e));
    } finally {
      setBusy(false);
    }
  }

  const myRow = rows.find((r) => r.user_id === myId);

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
            : myRow?.score != null
              ? `Checked in — ${myRow.score}`
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
              {item.score === null ? 'pending' : String(item.score)}
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

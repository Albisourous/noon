import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  acceptFriendRequest,
  fetchFriendships,
  fetchProfiles,
  searchHandle,
  sendFriendRequest,
} from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { colors, font, radius, screen } from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonRows } from '../../components/SkeletonRows';
import type { Friendship } from '../../lib/types';

interface FriendRow {
  friendshipId: string;
  otherId: string;
  handle: string | null;
  status: 'pending' | 'accepted';
  incoming: boolean;
}

export default function Friends() {
  const [myId, setMyId] = useState('');
  const [rows, setRows] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState('');
  const [queryFocused, setQueryFocused] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, flashStatus] = useFlashStatus();

  const load = useCallback(async () => {
    const uid = (await supabase.auth.getUser()).data.user?.id ?? 'me';
    setMyId(uid);
    const friendships = await fetchFriendships();
    const otherIds = friendships.map((f) =>
      f.requester_id === uid ? f.addressee_id : f.requester_id,
    );
    const profiles = otherIds.length ? await fetchProfiles(otherIds) : [];
    const byId = new Map(profiles.map((p) => [p.id, p]));
    setRows(
      friendships.map((f) => {
        const otherId = f.requester_id === uid ? f.addressee_id : f.requester_id;
        return {
          friendshipId: f.id,
          otherId,
          handle: byId.get(otherId)?.handle ?? null,
          status: f.status,
          incoming: f.addressee_id === uid,
        };
      }),
    );
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function acceptRequest(item: FriendRow) {
    const { error } = await acceptFriendRequest(item.friendshipId);
    if (error) {
      flashStatus(error.message);
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRows((r) => r.filter((x) => x.friendshipId !== item.friendshipId));
    flashStatus('Friend request accepted');
  }

  async function onAdd() {
    const target = await searchHandle(query);
    if (!target) {
      Alert.alert('Not found', `No user with handle "${query.trim()}".`);
      return;
    }
    if (target.id === myId) {
      Alert.alert('That is you');
      return;
    }
    const { error } = await sendFriendRequest(target.id);
    if (error) Alert.alert('Could not add', error.message);
    else {
      setQuery('');
      await load();
    }
  }

  return (
    <View style={screen}>
      <Text style={styles.title}>Friends</Text>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, queryFocused && styles.inputFocused]}
          placeholder="add by handle"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          returnKeyType="search"
          onSubmitEditing={onAdd}
          onFocus={() => setQueryFocused(true)}
          onBlur={() => setQueryFocused(false)}
          value={query}
          onChangeText={setQuery}
        />
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.friendshipId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.handle}>{item.handle ?? 'unnamed'}</Text>
            {item.status === 'pending' ? (
              item.incoming ? (
                <Pressable
                  style={styles.acceptButton}
                  onPress={() => acceptRequest(item)}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
              ) : (
                <Badge label="requested" />
              )
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          loaded ? (
            <EmptyState
              title="No friends yet"
              hint="Search a handle above to send your first friend request."
            />
          ) : (
            <SkeletonRows />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...font.title, marginBottom: 20 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputFocused: { borderColor: colors.accent },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addText: { color: colors.text, fontWeight: '700' },
  status: { color: colors.secondary, marginBottom: 10, textAlign: 'center' },
  listContent: { paddingBottom: 120 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 8,
    justifyContent: 'space-between',
  },
  handle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  acceptButton: {
    backgroundColor: colors.success,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  acceptText: { color: colors.text, fontWeight: '700' },
});

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  LayoutAnimation,
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
import {
  colors,
  font,
  layout,
  motion,
  opacity,
  radius,
  screen,
  spacing,
} from '../../lib/theme';
import { useFlashStatus } from '../../lib/useFlashStatus';
import PressableScale from '../../components/PressableScale';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonRows } from '../../components/SkeletonRows';
import NightFooter from '../../components/NightFooter';

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
    const uid = 'me';
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
    LayoutAnimation.configureNext(LayoutAnimation.Presets[motion.listChange]);
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
    if (error) {
      Alert.alert('Could not add', error.message);
      return;
    }
    setQuery('');
    await load();
  }

  return (
    <View style={screen}>
      <Text style={styles.eyebrow}>Your circle</Text>
      <Text style={styles.title}>Friends</Text>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, queryFocused && styles.inputFocused]}
          placeholder="add by handle"
          placeholderTextColor={colors.secondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={onAdd}
          onFocus={() => setQueryFocused(true)}
          onBlur={() => setQueryFocused(false)}
          value={query}
          onChangeText={setQuery}
        />
        <PressableScale
          accessibilityRole="button"
          style={[
            styles.addButton,
            !query.trim() && { opacity: opacity.disabled },
          ]}
          onPress={onAdd}
          disabled={!query.trim()}
        >
          <Text style={styles.addText}>Add</Text>
        </PressableScale>
      </View>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      <FlatList
        data={rows}
        keyExtractor={(r) => r.friendshipId}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => (
          <FriendRowItem
            item={item}
            index={index}
            onAccept={acceptRequest}
          />
        )}
        ListFooterComponent={loaded ? <NightFooter /> : undefined}
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

function FriendRowItem({
  item,
  index,
  onAccept,
}: {
  item: FriendRow;
  index: number;
  onAccept: (item: FriendRow) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: motion.enter.duration,
      delay: index * motion.enter.stagger,
      easing: motion.enter.easing,
      useNativeDriver: motion.enter.useNativeDriver,
    }).start();
  }, [anim, index]);

  return (
    <Animated.View
      style={[
        styles.row,
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
      <Text style={styles.handle}>{item.handle ?? 'unnamed'}</Text>
      {item.status === 'pending' ? (
        item.incoming ? (
          <PressableScale
            accessibilityRole="button"
            style={styles.acceptButton}
            onPress={() => onAccept(item)}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </PressableScale>
        ) : (
          <Badge label="requested" />
        )
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...font.eyebrow, marginBottom: spacing.xs },
  title: { ...font.title, marginBottom: spacing.xl },
  addRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    ...font.body,
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: { borderColor: colors.accent },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    justifyContent: 'center',
  },
  addText: { ...font.button },
  status: {
    color: colors.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  listContent: { paddingBottom: layout.listBottom },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.sm,
    justifyContent: 'space-between',
  },
  handle: { ...font.bodyStrong },
  acceptButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  acceptText: { ...font.button },
});

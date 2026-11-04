import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const NOON_NOTIFICATION_ID = 'outsleep-noon-daily';

export async function scheduleNoonReminder(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;

  await Notifications.cancelScheduledNotificationAsync(NOON_NOTIFICATION_ID).catch(
    () => {},
  );

  if (Platform.OS === 'ios') {
    await Notifications.scheduleNotificationAsync({
      identifier: NOON_NOTIFICATION_ID,
      content: {
        title: "It's noon.",
        body: 'Check in and see how the board looks.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });
  }
  return true;
}

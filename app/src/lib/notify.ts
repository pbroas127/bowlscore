// Local notifications only (switch plan steps, recall notices, the trial reminder). Remote push is not used.
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

const native = Platform.OS !== 'web'

// Without a handler iOS stays silent while the app is open, which is exactly when a recall check runs.
export function startNotifications() {
  if (native) Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) })
}

export const canNotify = async () => native && (await Notifications.getPermissionsAsync().catch(() => undefined))?.granted === true
// Prompts. Only call this from something the person just tapped.
export const askToNotify = async () => (await canNotify()) || (native && (await Notifications.requestPermissionsAsync().catch(() => undefined))?.granted === true)

// Fires now, or at `when`. Resolves to the id needed to cancel it, or undefined if scheduling failed.
export const notify = (title: string, body: string, when?: Date) =>
  Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: when ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when } : null }).catch(() => undefined)

export const cancelNotifications = (ids: string[]) => Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))

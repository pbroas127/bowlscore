// Local notifications only (switch plan steps, recall notices, the trial reminder). Remote push is not used.
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { openShop } from './links'

const native = Platform.OS !== 'web'

// Without a handler iOS stays silent while the app is open, which is exactly when a recall check runs.
// The bag reminder carries a Reorder button that opens the reorder link straight from the lock screen.
export function startNotifications() {
  if (!native) return
  Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) })
  Notifications.setNotificationCategoryAsync(BAG, [{ identifier: REORDER, buttonTitle: 'Reorder', options: { opensAppToForeground: true } }]).catch(() => {})
  const handle = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url
    if (r?.actionIdentifier === REORDER && typeof url === 'string') openShop(url)
  }
  Notifications.addNotificationResponseReceivedListener(handle)
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {}) // the tap that launched the app
}
const BAG = 'bag'
const REORDER = 'reorder'

export const canNotify = async () => native && (await Notifications.getPermissionsAsync().catch(() => undefined))?.granted === true
// Prompts. Only call this from something the person just tapped.
export const askToNotify = async () => (await canNotify()) || (native && (await Notifications.requestPermissionsAsync().catch(() => undefined))?.granted === true)

// Fires now, or at `when`. Resolves to the id needed to cancel it, or undefined if scheduling failed.
export const notify = (title: string, body: string, when?: Date, reorderUrl?: string) =>
  Notifications.scheduleNotificationAsync({
    content: { title, body, ...(reorderUrl && { categoryIdentifier: BAG, data: { url: reorderUrl } }) },
    trigger: when ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when } : null,
  }).catch(() => undefined)

export const cancelNotifications = (ids: string[]) => Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})))

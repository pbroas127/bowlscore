import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import type { Grade } from '@/theme'

type Kind = 'select' | 'light' | 'medium' | 'success' | 'warning' | 'error'

export function tap(kind: Kind) {
  if (Platform.OS === 'web') return
  const run = {
    select: () => Haptics.selectionAsync(),
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  }[kind]
  run().catch(() => {})
}

// The result haptic matches the grade, so a bad food feels bad before you read it.
export const tapForGrade = (grade: Grade) => tap(grade === 'Bad' ? 'error' : grade === 'Poor' ? 'warning' : 'success')

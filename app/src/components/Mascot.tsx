import { useEffect } from 'react'
import { Image } from 'expo-image'
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import type { StyleProp, ViewStyle } from 'react-native'

const POSES = {
  'pair-happy': require('../../assets/mascots/pair-happy.png'),
  'pair-celebrating': require('../../assets/mascots/pair-celebrating.png'),
  'pair-sleeping': require('../../assets/mascots/pair-sleeping.png'),
  'puppy-happy': require('../../assets/mascots/puppy-happy.png'),
  'puppy-worried': require('../../assets/mascots/puppy-worried.png'),
  'puppy-sniffing': require('../../assets/mascots/puppy-sniffing.png'),
  'puppy-head': require('../../assets/mascots/puppy-head.png'),
  'kitten-happy': require('../../assets/mascots/kitten-happy.png'),
  'kitten-worried': require('../../assets/mascots/kitten-worried.png'),
  'kitten-peeking': require('../../assets/mascots/kitten-peeking.png'),
  'kitten-head': require('../../assets/mascots/kitten-head.png'),
} as const

export type Pose = keyof typeof POSES

// Static art brought to life with a slow bob, so the mascots feel alive without an animation runtime.
export function Mascot({ pose, size = 160, bob = true, style }: { pose: Pose; size?: number; bob?: boolean; style?: StyleProp<ViewStyle> }) {
  const y = useSharedValue(0)
  useEffect(() => {
    if (!bob) return
    y.value = withRepeat(withSequence(withTiming(-5, { duration: 1400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.sin) })), -1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bob])
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }))
  return (
    <Animated.View style={[{ width: size, height: size }, anim, style]} pointerEvents="none">
      <Image source={POSES[pose]} style={{ width: size, height: size }} contentFit="contain" accessibilityIgnoresInvertColors />
    </Animated.View>
  )
}

export const mascotFor = (species: 'dog' | 'cat' | 'both' | undefined, mood: 'happy' | 'worried' | 'head') =>
  (species === 'cat' ? `kitten-${mood}` : `puppy-${mood}`) as Pose

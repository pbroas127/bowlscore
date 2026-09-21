import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { color, font, gradeColor, gradeFor, type } from '@/theme'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Draws clockwise from 12 o'clock while the numeral counts up. `animate={false}` shows the final state (lists, reduce motion).
export function ScoreRing({ score, size = 160, stroke = 14, animate = true, delay = 0, showWord = true, onDone }: { score: number; size?: number; stroke?: number; animate?: boolean; delay?: number; showWord?: boolean; onDone?: () => void }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const progress = useSharedValue(animate ? 0 : score / 100)
  const [shown, setShown] = useState(animate ? 0 : score)
  const tone = gradeColor(shown || score)

  useEffect(() => {
    if (!animate) { setShown(score); progress.value = score / 100; return }
    const duration = 900
    progress.value = withDelay(delay, withTiming(score / 100, { duration, easing: Easing.out(Easing.cubic) }))
    let raf = 0
    const start = Date.now() + delay
    const tick = () => {
      const k = Math.min(1, Math.max(0, (Date.now() - start) / duration))
      setShown(Math.round(score * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
      else onDone?.()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, animate, delay])

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.value) }))
  const big = size >= 120

  return (
    <View style={{ alignItems: 'center', gap: big ? 8 : 0 }} accessibilityLabel={`Score ${score} out of 100, ${gradeFor(score)}`}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color.hairline} strokeWidth={stroke} fill="none" />
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={tone} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${c} ${c}`} animatedProps={ringProps} />
        </Svg>
        <Text style={big ? type.score : { fontFamily: font.display, fontSize: size * 0.36, color: color.ink, fontVariant: ['tabular-nums'] }}>{shown}</Text>
        {big ? <Text style={[type.caption, { marginTop: -6 }]}>out of 100</Text> : null}
      </View>
      {big && showWord ? <Text style={[type.h2, { color: tone }]}>{gradeFor(shown || score)}</Text> : null}
    </View>
  )
}

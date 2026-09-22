import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { color, font } from '@/theme'

// The app name on the screens creators film, the way Cal AI keeps its logo top left, so every clip says what app it is.
export function Brand({ size = 26 }: { size?: number }) {
  return (
    <View style={s.row} accessible accessibilityRole="header" accessibilityLabel="BowlScore">
      <Image source={require('../../assets/images/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.3 }} />
      <Text style={[s.word, { fontSize: Math.round(size * 0.8), lineHeight: Math.round(size * 0.98) }]} allowFontScaling={false}>BowlScore</Text>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  word: { fontFamily: font.display, color: color.ink, letterSpacing: -0.4 },
})

import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { color } from '@/theme'

// The app name on the screens creators film, the way Cal AI keeps its logo top left, so every clip says what app it is.
export function Brand({ size = 28 }: { size?: number }) {
  return (
    <View style={s.row} accessibilityRole="header" accessibilityLabel="BowlScore">
      <Image source={require('../../assets/images/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.28 }} />
      <Text style={[s.word, { fontSize: size * 0.82 }]}>BowlScore</Text>
    </View>
  )
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: 'BricolageGrotesque_800ExtraBold', color: color.ink, letterSpacing: -0.5 },
})

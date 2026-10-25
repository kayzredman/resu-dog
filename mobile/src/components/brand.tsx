// The Resu-Dog mark, as on the website: a white paw in a rounded violet tile with a soft glow,
// plus the lowercase wordmark with "-dog" in violet.

import { StyleSheet, Text, View } from 'react-native';

import { NativeIcon } from '@/components/native';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({ size = 40 }: { size?: number }) {
  const c = useTheme();
  return (
    <View
      accessible={false}
      style={[
        styles.tile,
        { width: size, height: size, borderRadius: size * 0.25, backgroundColor: c.primary, shadowColor: c.primary },
      ]}>
      <NativeIcon name="paw" size={size * 0.55} color={c.onPrimary} />
    </View>
  );
}

export function Wordmark({ size = 22 }: { size?: number }) {
  const c = useTheme();
  return (
    <Text accessibilityRole="header" accessibilityLabel="Resu-Dog" style={[styles.word, { fontSize: size, color: c.text }]}>
      resu<Text style={{ color: c.primaryInk }}>-dog</Text>
    </Text>
  );
}

export function BrandLockup({ size = 40 }: { size?: number }) {
  return (
    <View style={styles.lockup}>
      <BrandMark size={size} />
      <Wordmark size={Math.round(size * 0.58)} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The site's violet glow (shadow-lg in rgba(108,99,255,0.4))
  tile: { alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  word: { fontWeight: '700', letterSpacing: -0.4 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

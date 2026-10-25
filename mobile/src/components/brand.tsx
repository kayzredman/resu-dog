// The Resu-Dog mark: a paw in a rounded green tile, plus the wordmark.

import { StyleSheet, Text, View } from 'react-native';

import { NativeIcon } from '@/components/native';
import { useTheme } from '@/hooks/use-theme';

export function BrandMark({ size = 40 }: { size?: number }) {
  const c = useTheme();
  return (
    <View
      accessible={false}
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.primary }]}>
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
  tile: { alignItems: 'center', justifyContent: 'center' },
  word: { fontWeight: '800', letterSpacing: -0.4 },
  lockup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});

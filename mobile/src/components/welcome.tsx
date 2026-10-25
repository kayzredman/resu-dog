// First-run welcome: brand, one product picture, one line, one way in. Shown once; replayable from About.

import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandLockup } from '@/components/brand';
import { HeroVisual } from '@/components/hero-visual';
import { NativeButton } from '@/components/native';
import { T } from '@/components/ui';
import { MinTouch, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useIntro } from '@/lib/intro';

export function Welcome() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { finish } = useIntro();

  const buildInstead = () => {
    finish();
    router.navigate('/build');
  };

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} accessibilityViewIsModal>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <BrandLockup size={36} />
        <HeroVisual />
        <View style={{ gap: Spacing.sm }}>
          <T variant="title" style={styles.headline}>Your resume, ready for the job.</T>
          <T tone="muted">Tailored to the role. Honest — we never invent numbers. Private.</T>
        </View>
      </ScrollView>

      {/* The way in stays on screen — no scrolling needed to start */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <NativeButton label="Get started" onPress={finish} />
        <Pressable
          accessibilityRole="button"
          onPress={buildInstead}
          style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.6 }]}>
          <T variant="heading" tone="primary">No resume yet? Build one</T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.gutter, paddingBottom: Spacing.lg, gap: Spacing.xl },
  headline: { fontSize: 32, lineHeight: 37, letterSpacing: -0.7 },
  footer: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.sm, gap: Spacing.xs },
  secondary: { minHeight: MinTouch, alignItems: 'center', justifyContent: 'center' },
});

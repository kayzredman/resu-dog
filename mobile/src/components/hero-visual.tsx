// The welcome screen's product picture, drawn in code: a tilted resume page with job keywords
// highlighted and one [X%] blank to fill, a floating score badge and a "cover letter ready" chip.
// Sharp at any size, follows light/dark, and animates in once (skipped under Reduce Motion).

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ReduceMotion, ZoomIn } from 'react-native-reanimated';

import { NativeIcon } from '@/components/native';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const HEIGHT = 380;

export function HeroVisual() {
  const c = useTheme();
  const bar = { backgroundColor: c.line };

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Illustration: a resume with job keywords highlighted, one number left blank for you to fill in, and a match score rising from 46 to 74."
      style={[styles.stage, { backgroundColor: c.primaryTint }]}>
      {/* The resume page */}
      {/* Entry animations drive `transform`, so each tilt lives on a plain wrapper */}
      <View style={[styles.pageWrap, styles.tiltPage]}>
      <Animated.View
        entering={FadeInDown.duration(500).reduceMotion(ReduceMotion.System)}
        style={[styles.page, { backgroundColor: c.surface, shadowColor: '#000' }]}>
        <View style={styles.pageHeader}>
          <View style={[styles.avatar, { backgroundColor: c.primary }]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.bar, { width: '62%', height: 10, backgroundColor: c.text }]} />
            <View style={[styles.bar, { width: '40%' }, bar]} />
          </View>
        </View>

        <Text style={[styles.section, { color: c.textMuted }]}>EXPERIENCE</Text>
        <View style={styles.row}>
          <View style={[styles.bar, { flex: 1 }, bar]} />
          <Keyword label="Python" />
          <View style={[styles.bar, { width: 26 }, bar]} />
        </View>
        <View style={styles.row}>
          <View style={[styles.bar, { width: 38 }, bar]} />
          <Keyword label="AWS" />
          <View style={[styles.bar, { flex: 1 }, bar]} />
        </View>
        <View style={styles.row}>
          <View style={[styles.bar, { flex: 1 }, bar]} />
          <Text
            style={[
              styles.blank,
              { backgroundColor: c.placeholderBg, color: c.placeholderText, textDecorationColor: c.placeholderLine },
            ]}>
            [X%]
          </Text>
        </View>
        <View style={[styles.bar, { width: '78%' }, bar]} />

        <Text style={[styles.section, { color: c.textMuted }]}>SKILLS</Text>
        <View style={styles.row}>
          <Keyword label="Docker" />
          <Keyword label="APIs" />
          <View style={[styles.bar, { flex: 1 }, bar]} />
        </View>
      </Animated.View>
      </View>

      {/* Floating score badge */}
      <View style={[styles.badgePos, styles.tiltBadge]}>
      <Animated.View
        entering={ZoomIn.delay(350).springify().reduceMotion(ReduceMotion.System)}
        style={[styles.badge, { backgroundColor: c.surface, shadowColor: '#000' }]}>
        <Text style={[styles.badgeLabel, { color: c.textMuted }]}>MATCH</Text>
        <View style={styles.badgeRow}>
          <Text style={[styles.badgeOld, { color: c.textMuted }]}>46</Text>
          <Text style={[styles.badgeArrow, { color: c.textMuted }]}>→</Text>
          <Text style={[styles.badgeNew, { color: c.primaryInk }]}>74</Text>
        </View>
      </Animated.View>
      </View>

      {/* Floating "cover letter" chip */}
      <View style={[styles.chipPos, styles.tiltChip]}>
      <Animated.View
        entering={FadeInUp.delay(600).duration(450).reduceMotion(ReduceMotion.System)}
        style={[styles.chip, { backgroundColor: c.surface, shadowColor: '#000' }]}>
        <NativeIcon name="check" size={18} color={c.primaryInk} />
        <Text style={[styles.chipText, { color: c.text }]}>Cover letter ready</Text>
      </Animated.View>
      </View>
    </View>
  );
}

function Keyword({ label }: { label: string }) {
  const c = useTheme();
  return (
    <View style={[styles.keyword, { backgroundColor: c.primary }]}>
      <Text style={[styles.keywordText, { color: c.onPrimary }]}>{label}</Text>
    </View>
  );
}

const shadow = {
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

const styles = StyleSheet.create({
  stage: { height: HEIGHT, borderRadius: 28, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  pageWrap: { width: '72%' },
  tiltPage: { transform: [{ rotate: '-4deg' }] },
  tiltBadge: { transform: [{ rotate: '5deg' }] },
  tiltChip: { transform: [{ rotate: '-3deg' }] },
  page: { borderRadius: Radius.lg, padding: 18, gap: 10, ...shadow },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  avatar: { width: 34, height: 34, borderRadius: 17 },
  section: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bar: { height: 7, borderRadius: 4 },
  keyword: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  keywordText: { fontSize: 11, fontWeight: '700' },
  blank: {
    fontSize: 12,
    fontWeight: '800',
    borderRadius: 4,
    overflow: 'hidden',
    paddingHorizontal: 4,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
  badgePos: { position: 'absolute', top: 28, right: 18 },
  badge: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, ...shadow },
  badgeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  badgeOld: { fontSize: 18, fontWeight: '700', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  badgeArrow: { fontSize: 14, fontWeight: '700' },
  badgeNew: { fontSize: 32, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  chipPos: { position: 'absolute', bottom: 30, left: 18 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...shadow,
  },
  chipText: { fontSize: 14, fontWeight: '700' },
});

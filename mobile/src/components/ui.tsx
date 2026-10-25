// Layout and text building blocks (plain React Native views).
// Interactive controls (buttons, segmented pickers, sheets, icons) are native — see native.tsx.

import { useCallback, useRef, type ComponentRef, type ReactNode, type Ref } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NativeIcon, type IconKey } from '@/components/native';
import { BodySize, MinTouch, Radius, Spacing, TabBarClearance } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Layout ──────────────────────────────────────────────────────────────────

export type ScreenRef = ComponentRef<typeof ScrollView>;

/** A ref for a <Screen headerInset> plus a function that scrolls it back to the top. */
export function useScrollToTop() {
  const ref = useRef<ScreenRef>(null);
  const scrollToTop = useCallback(() => {
    ref.current?.scrollTo({ y: 0, animated: true });
  }, []);
  return { ref, scrollToTop };
}

/**
 * Scrolling screen body that sits correctly under large titles, the tab bar and the keyboard.
 * `headerInset`: reserve the header's space ourselves instead of letting iOS inset the content,
 * so offset 0 is the real top and scrollTo({ y: 0 }) works (iOS insets put the top at a negative
 * offset, which scrollTo can't reach). Use it on screens without a large title.
 */
export function Screen({
  children,
  ref,
  headerInset,
  ...props
}: ScrollViewProps & { children: ReactNode; ref?: Ref<ScreenRef>; headerInset?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const manualTop = headerInset && Platform.OS === 'ios' ? headerHeight : 0;
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1, backgroundColor: c.background }}
      // The system tab bar floats over content and can't be measured, so leave room for it
      contentContainerStyle={[
        styles.screenContent,
        { paddingBottom: insets.bottom + TabBarClearance },
        manualTop ? { paddingTop: manualTop + Spacing.sm } : null,
      ]}
      scrollIndicatorInsets={manualTop ? { top: manualTop } : undefined}
      contentInsetAdjustmentBehavior={manualTop ? 'never' : 'automatic'}
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      {...props}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

// ─── Text ────────────────────────────────────────────────────────────────────

export type Tone = 'default' | 'soft' | 'muted' | 'primary' | 'success' | 'placeholder' | 'danger';

export function T({
  children,
  variant = 'body',
  tone = 'default',
  style,
  selectable,
  accessibilityRole,
}: {
  children: ReactNode;
  variant?: 'title' | 'heading' | 'body' | 'subhead' | 'footnote' | 'overline';
  tone?: Tone;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
  accessibilityRole?: 'header';
}) {
  const c = useTheme();
  const color = {
    default: c.text,
    soft: c.textSoft,
    muted: c.textMuted,
    primary: c.primaryInk,
    success: c.success,
    placeholder: c.placeholderText,
    danger: c.danger,
  }[tone];
  return (
    <Text
      selectable={selectable}
      accessibilityRole={accessibilityRole ?? (variant === 'title' || variant === 'heading' ? 'header' : undefined)}
      style={[styles[variant], { color }, style]}>
      {children}
    </Text>
  );
}

// ─── Rows and bits ───────────────────────────────────────────────────────────

/** A tappable list row with an icon, title, subtitle and chevron. */
export function LinkRow({
  icon,
  title,
  subtitle,
  onPress,
  accessibilityHint,
}: {
  icon: IconKey;
  title: string;
  subtitle?: string;
  onPress: () => void;
  accessibilityHint?: string;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      android_ripple={{ color: 'rgba(127,127,127,0.15)' }}
      style={({ pressed }) => [
        styles.linkRow,
        { backgroundColor: pressed ? c.surfaceMuted : c.surface, borderColor: c.line },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: c.primaryTint }]}>
        <NativeIcon name={icon} color={c.primaryInk} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="heading" style={{ fontSize: 17 }}>{title}</T>
        {subtitle ? <T variant="subhead" tone="muted">{subtitle}</T> : null}
      </View>
      <NativeIcon name="chevron" size={16} />
    </Pressable>
  );
}

export type PillTone = 'primary' | 'placeholder' | 'neutral' | 'danger';

/** A status chip. Always carries a word — colour is never the only signal. */
export function Pill({ label, tone = 'primary', icon }: { label: string; tone?: PillTone; icon?: IconKey }) {
  const c = useTheme();
  const palette = {
    primary: { bg: c.primaryTint, fg: c.primaryInk, border: 'transparent' },
    placeholder: { bg: c.placeholderBg, fg: c.placeholderText, border: 'transparent' },
    neutral: { bg: c.surfaceMuted, fg: c.textSoft, border: c.lineStrong },
    danger: { bg: c.dangerTint, fg: c.danger, border: 'transparent' },
  }[tone];
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.pill, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      {icon ? <NativeIcon name={icon} size={14} color={palette.fg} /> : null}
      <Text style={[styles.pillText, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

export function Notice({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'placeholder' }) {
  const c = useTheme();
  const bg = tone === 'danger' ? c.dangerTint : c.placeholderBg;
  const fg = tone === 'danger' ? c.danger : c.placeholderText;
  return (
    <View accessibilityRole="alert" style={[styles.notice, { backgroundColor: bg }]}>
      <NativeIcon name="warning" color={fg} />
      <View style={{ flex: 1 }}>{typeof children === 'string' ? <T tone={tone}>{children}</T> : children}</View>
    </View>
  );
}

export function Bullets({ items, tone = 'soft' }: { items: string[]; tone?: Tone }) {
  const c = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={[styles.bulletDot, { backgroundColor: c.primaryInk }]} />
          <T tone={tone} style={{ flex: 1 }}>{item}</T>
        </View>
      ))}
    </View>
  );
}

/** Small text action, padded to a full-size touch target. */
export function TextAction({ title, onPress, accessibilityLabel }: { title: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.textAction, pressed && { opacity: 0.6 }]}>
      <T variant="subhead" tone="primary" style={{ fontWeight: '600' }}>{title}</T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: { paddingHorizontal: Spacing.gutter, paddingTop: Spacing.sm, gap: Spacing.lg },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: Spacing.gutter, gap: Spacing.md },

  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: BodySize, lineHeight: Math.round(BodySize * 1.4) },
  subhead: { fontSize: 15, lineHeight: 20 },
  footnote: { fontSize: 13, lineHeight: 18 },
  overline: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },

  linkRow: {
    minHeight: MinTouch + 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    overflow: 'hidden',
  },
  rowIcon: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },

  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 14, fontWeight: '600' },

  notice: { flexDirection: 'row', gap: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'flex-start' },

  bulletRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 10 },

  textAction: { minHeight: MinTouch, justifyContent: 'center', paddingHorizontal: Spacing.xs },
});

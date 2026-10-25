// Native controls from @expo/ui: SwiftUI on iOS, Jetpack Compose on Android.
// One API for both platforms; each renders as the system's own control.

import { BottomSheet, Button, Column, Host, Icon, ScrollView as NativeScrollView, Text as NativeText } from '@expo/ui';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { fillMaxWidth, height as composeHeight } from '@expo/ui/jetpack-compose/modifiers';
import { Text as SwiftText } from '@expo/ui/swift-ui';
import { controlSize, frame } from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { MinTouch } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ─── Icons: SF Symbols on iOS, Material Symbols on Android ───────────────────

export const Icons = {
  help: Icon.select({ ios: 'questionmark.circle', android: import('@expo/material-symbols/help.xml') }),
  upload: Icon.select({ ios: 'doc.badge.plus', android: import('@expo/material-symbols/upload_file.xml') }),
  file: Icon.select({ ios: 'doc.text', android: import('@expo/material-symbols/description.xml') }),
  check: Icon.select({ ios: 'checkmark.circle.fill', android: import('@expo/material-symbols/check_circle.xml') }),
  close: Icon.select({ ios: 'minus.circle', android: import('@expo/material-symbols/remove.xml') }),
  todo: Icon.select({ ios: 'circle.dashed', android: import('@expo/material-symbols/radio_button_unchecked.xml') }),
  chevron: Icon.select({ ios: 'chevron.right', android: import('@expo/material-symbols/chevron_right.xml') }),
  edit: Icon.select({ ios: 'pencil', android: import('@expo/material-symbols/edit.xml') }),
  warning: Icon.select({ ios: 'exclamationmark.triangle', android: import('@expo/material-symbols/warning.xml') }),
  shield: Icon.select({ ios: 'checkmark.shield', android: import('@expo/material-symbols/shield.xml') }),
  idea: Icon.select({ ios: 'lightbulb', android: import('@expo/material-symbols/lightbulb.xml') }),
  paw: Icon.select({ ios: 'pawprint.fill', android: import('@expo/material-symbols/pets.xml') }),
  target: Icon.select({ ios: 'scope', android: import('@expo/material-symbols/tune.xml') }),
  verified: Icon.select({ ios: 'checkmark.seal', android: import('@expo/material-symbols/verified.xml') }),
  lock: Icon.select({ ios: 'lock', android: import('@expo/material-symbols/lock.xml') }),
};

export type IconKey = keyof typeof Icons;

/** A decorative native icon. Pair it with visible text — it is never the only signal. */
export function NativeIcon({ name, size = 20, color }: { name: IconKey; size?: number; color?: string }) {
  const c = useTheme();
  return (
    <Host matchContents accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Icon name={Icons[name]} size={size} color={color ?? c.textMuted} />
    </Host>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

const LARGE = Platform.select({
  ios: [controlSize('large')],
  android: [composeHeight(MinTouch + 8)],
  default: [],
});

// Android: the Compose button itself fills the row. (iOS needs the label to fill instead — see below.)
const FULL_WIDTH = Platform.select({ android: [fillMaxWidth()], default: [] });

/**
 * Full-width native button. `filled` is the screen's one primary action
 * (iOS borderedProminent / Material filled); `outlined` and `text` are secondary.
 */
export function NativeButton({
  label,
  onPress,
  variant = 'filled',
  disabled,
  loading,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'outlined' | 'text';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
}) {
  const c = useTheme();

  if (loading) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${label}, working`}
        style={[styles.loading, { backgroundColor: variant === 'filled' ? c.primary : c.surfaceMuted }]}>
        <ActivityIndicator color={variant === 'filled' ? c.onPrimary : c.primaryInk} />
      </View>
    );
  }

  return (
    <Host
      // Full width: we set the width, the native button sets its height. Compact: size to the button.
      matchContents={fullWidth ? { vertical: true } : true}
      seedColor={c.primary}
      style={fullWidth ? styles.fullWidth : undefined}>
      <Button
        label={Platform.OS === 'ios' && fullWidth ? undefined : label}
        variant={variant}
        disabled={disabled}
        modifiers={fullWidth ? [...LARGE, ...FULL_WIDTH] : LARGE}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onPress();
        }}>
        {Platform.OS === 'ios' && fullWidth ? (
          // SwiftUI sizes a button to its label, so the label takes the full width
          <SwiftText modifiers={[frame({ maxWidth: Infinity })]}>{label}</SwiftText>
        ) : undefined}
      </Button>
    </Host>
  );
}

// ─── Segmented control ───────────────────────────────────────────────────────

/** iOS UISegmentedControl / Material 3 SegmentedButton. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  accessibilityLabel: string;
}) {
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <SegmentedControl
      values={options.map((o) => o.label)}
      selectedIndex={selectedIndex}
      accessibilityLabel={accessibilityLabel}
      style={styles.segmented}
      onChange={(e) => {
        const next = options[e.nativeEvent.selectedSegmentIndex];
        if (next && next.value !== value) {
          Haptics.selectionAsync().catch(() => {});
          onChange(next.value);
        }
      }}
    />
  );
}

// ─── Bottom sheet with simple native content ─────────────────────────────────

export interface SheetSection {
  heading?: string;
  body: string;
}

/** A native bottom sheet (iOS sheet / Material ModalBottomSheet) of headed paragraphs. */
export function InfoSheet({
  title,
  sections,
  isPresented,
  onDismiss,
}: {
  title: string;
  sections: SheetSection[];
  isPresented: boolean;
  onDismiss: () => void;
}) {
  const c = useTheme();
  return (
    <BottomSheet isPresented={isPresented} onDismiss={onDismiss} snapPoints={['half', 'full']} contentPadding={24}>
      {/* Scrolls instead of squeezing: at half height long paragraphs were being cut off with "…" */}
      <NativeScrollView>
      <Column spacing={16} alignment="start">
        <NativeText textStyle={{ fontSize: 22, fontWeight: '700', color: c.text }}>{title}</NativeText>
        {sections.map((s, i) => (
          <Column key={i} spacing={4} alignment="start">
            {s.heading ? (
              <NativeText textStyle={{ fontSize: 17, fontWeight: '600', color: c.text }}>{s.heading}</NativeText>
            ) : null}
            <NativeText textStyle={{ fontSize: 16, lineHeight: 22, color: c.textMuted }}>{s.body}</NativeText>
          </Column>
        ))}
      </Column>
      </NativeScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  loading: { minHeight: MinTouch + 4, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmented: { minHeight: 36 },
});

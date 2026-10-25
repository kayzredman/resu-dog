/**
 * Resu-Dog colour tokens — the merged "Coach × Clarity" direction (see DESIGN-SPEC.md).
 * Text pairs meet WCAG AA 4.5:1; input borders (lineStrong) meet 3:1 against surface and background.
 *   primary     — fills (buttons); white text on it passes in both themes
 *   primaryInk  — primary-coloured TEXT on this theme's backgrounds
 *   placeholder — the [X%] fill-in highlights: bg + text, plus an underline so colour isn't the only cue
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F5F6F1',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF0EA',
    line: '#E1E5DC',
    lineStrong: '#858F88',
    text: '#16201A',
    textSoft: '#333D37',
    textMuted: '#55605A',
    primary: '#1D6B47',
    primaryPressed: '#15543A',
    primaryInk: '#1D6B47',
    primaryTint: '#E5F0E9',
    onPrimary: '#FFFFFF',
    success: '#1D6B47',
    placeholderBg: '#FDF1D6',
    placeholderText: '#6B4800',
    placeholderLine: '#8A5E00',
    danger: '#B4441F',
    dangerTint: '#FBE9E3',
  },
  dark: {
    background: '#0F1411',
    surface: '#1A211C',
    surfaceMuted: '#242C26',
    line: '#2C352F',
    lineStrong: '#6A766E',
    text: '#E8ECE9',
    textSoft: '#C9D1CC',
    textMuted: '#9AA59E',
    primary: '#1F7A50',
    primaryPressed: '#1A6844',
    primaryInk: '#6FCF9C',
    primaryTint: '#1E3328',
    onPrimary: '#FFFFFF',
    success: '#6FCF9C',
    placeholderBg: '#3D2E0A',
    placeholderText: '#FBD98A',
    placeholderLine: '#FBD98A',
    danger: '#F2937A',
    dangerTint: '#3A1F17',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  gutter: 20,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Apple: 44pt, Material: 48dp — 48 satisfies both. */
export const MinTouch = 48;

/** Space to keep below scrolling content so the floating system tab bar never covers it. */
export const TabBarClearance = Platform.select({ ios: 96, android: 104, default: 96 });

/** Body text: iOS default body is 17pt, Material body-large is 16sp. */
export const BodySize = Platform.select({ ios: 17, default: 16 });

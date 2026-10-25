/**
 * Resu-Dog colour tokens — the website's violet-on-dark look (frontend/app/globals.css), so the
 * app and the site read as one brand. Text pairs meet WCAG AA 4.5:1; input borders (lineStrong)
 * meet 3:1 against surface and background.
 *   primary     — fills (buttons); white text on it passes in both themes
 *   primaryInk  — primary-coloured TEXT on this theme's backgrounds
 *   success     — the site's teal accent
 *   placeholder — the [X%] fill-in highlights: bg + text, plus an underline so colour isn't the only cue
 * The app runs dark like the site (see app/_layout.tsx); light is kept for completeness.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    background: '#F8F8FC',
    surface: '#FFFFFF',
    surfaceMuted: '#F0F0F8',
    line: '#E0E0F0',
    lineStrong: '#80809F',
    text: '#0A0A0F',
    textSoft: '#1E1E3A',
    textMuted: '#5A5A80',
    primary: '#5B52F0',
    primaryPressed: '#4A42D6',
    primaryInk: '#5B52F0',
    primaryTint: '#ECEBFE',
    onPrimary: '#FFFFFF',
    success: '#007A62',
    placeholderBg: '#FDF1D6',
    placeholderText: '#6B4800',
    placeholderLine: '#8A5E00',
    danger: '#DC2626',
    dangerTint: '#FDE8E8',
  },
  dark: {
    background: '#0A0A0F',
    surface: '#12121A',
    surfaceMuted: '#1A1A26',
    line: '#1E1E2E',
    lineStrong: '#6A6A8A',
    text: '#F0F0F5',
    textSoft: '#C0C0D0',
    textMuted: '#8888AA',
    primary: '#5B52F0',
    primaryPressed: '#4A42D6',
    primaryInk: '#8B84FF',
    primaryTint: '#1F1D40',
    onPrimary: '#FFFFFF',
    success: '#00D4AA',
    placeholderBg: '#3A2C0A',
    placeholderText: '#FBD98A',
    placeholderLine: '#FBD98A',
    danger: '#F87171',
    dangerTint: '#3A1518',
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

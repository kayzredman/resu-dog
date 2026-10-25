import type { Stack } from 'expo-router';
import type { ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

type ScreenOptions = Exclude<
  NonNullable<ComponentProps<typeof Stack>['screenOptions']>,
  (...args: never[]) => unknown
>;

/**
 * Header options shared by every tab's stack. Large titles on iOS; the header itself is
 * drawn natively (colours come from the navigation theme set in the root layout).
 */
export function useStackOptions(): ScreenOptions {
  const c = useTheme();
  return {
    headerLargeTitle: true,
    headerShadowVisible: false,
    // Tint is for back buttons/actions; titles stay in the normal text colour, as on iOS/Android
    headerTintColor: c.primaryInk,
    headerTitleStyle: { color: c.text },
    headerLargeTitleStyle: { color: c.text },
    contentStyle: { backgroundColor: c.background },
  };
}

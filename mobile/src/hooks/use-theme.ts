/**
 * The app is set to dark at startup (app/_layout.tsx), so this returns the dark palette;
 * it still follows the scheme in case that changes.
 * https://docs.expo.dev/develop/user-interface/color-themes/
 */

import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme(): Palette {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

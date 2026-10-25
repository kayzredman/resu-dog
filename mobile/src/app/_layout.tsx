import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { Welcome } from '@/components/welcome';
import { Colors } from '@/constants/theme';
import { IntroProvider, useIntro } from '@/lib/intro';
import { SessionProvider } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <IntroProvider>
      <App />
    </IntroProvider>
  );
}

function App() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const { seen } = useIntro();

  // Keep the splash up until we know whether to show the welcome, so it never flashes
  useEffect(() => {
    if (seen !== null) SplashScreen.hideAsync();
  }, [seen]);

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, primary: c.primaryInk, background: c.background, card: c.surface, text: c.text, border: c.line },
      }}>
      <SessionProvider>
        <StatusBar style="auto" />
        {/* System tab bar: native look, haptics and accessibility on both platforms */}
        <NativeTabs tintColor={c.primaryInk}>
          <NativeTabs.Trigger name="(optimize)">
            <NativeTabs.Trigger.Label>Optimize</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="doc.text.magnifyingglass" md="find_in_page" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="build">
            <NativeTabs.Trigger.Label>Build CV</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="square.and.pencil" md="edit_note" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="about">
            <NativeTabs.Trigger.Label>About</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: 'info.circle', selected: 'info.circle.fill' }} md="info" />
          </NativeTabs.Trigger>
        </NativeTabs>
        {/* First run: the welcome sits over the tabs, so "Build one" can switch tab underneath */}
        {seen === false ? <Welcome /> : null}
      </SessionProvider>
    </ThemeProvider>
  );
}

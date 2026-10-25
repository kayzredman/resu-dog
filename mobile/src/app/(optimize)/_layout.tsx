import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export default function OptimizeStack() {
  const screenOptions = useStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Resu-Dog' }} />
      <Stack.Screen name="results" options={{ title: 'Your results', headerLargeTitle: false }} />
      <Stack.Screen name="formats" options={{ title: 'International formats', headerLargeTitle: false }} />
      <Stack.Screen name="profile" options={{ title: 'Shareable profile', headerLargeTitle: false }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export default function BuildStack() {
  const screenOptions = useStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Build a CV' }} />
      <Stack.Screen name="questions" options={{ title: 'Your experience', headerLargeTitle: false }} />
      <Stack.Screen name="result" options={{ title: 'Your new CV', headerLargeTitle: false }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';

import { useStackOptions } from '@/hooks/use-stack-options';

export default function ProfileStack() {
  const screenOptions = useStackOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
    </Stack>
  );
}

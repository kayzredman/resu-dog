// Honest progress for long AI runs: what we're doing and how long it's been — no fake
// percentage bars, since the server doesn't report stage-by-stage progress yet.

import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Bullets, Card, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function WorkingCard({ title, steps }: { title: string; steps: string[] }) {
  const c = useTheme();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card style={{ gap: Spacing.lg, paddingVertical: Spacing.xl }}>
      <View accessibilityLiveRegion="polite" style={{ alignItems: 'center', gap: Spacing.md }}>
        <ActivityIndicator size="large" color={c.primaryInk} />
        <T variant="title" style={{ textAlign: 'center' }}>{title}</T>
        <T tone="muted" style={{ textAlign: 'center' }}>
          Usually 1–3 minutes. Keep Resu-Dog open — if you leave, we may need to start again.
        </T>
        <T variant="heading" tone="primary" style={{ fontVariant: ['tabular-nums'] }}>
          {formatElapsed(seconds)}
        </T>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <T variant="overline" tone="muted">WHAT’S HAPPENING</T>
        <Bullets items={steps} tone="muted" />
      </View>
    </Card>
  );
}

function formatElapsed(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

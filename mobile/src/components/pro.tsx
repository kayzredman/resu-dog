// Pro entry points and the locked state. Free for everyone during the beta (see lib/entitlements).

import { View } from 'react-native';

import { NativeButton } from '@/components/native';
import { Card, LinkRow, Pill, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { PRO_FEATURES, usePro } from '@/lib/entitlements';

export function ProPill() {
  const { freeInBeta } = usePro();
  return <Pill icon="pro" label={freeInBeta ? 'Pro · free in beta' : 'Pro'} />;
}

/** "Take it further" on the results: international formats and the shareable profile. */
export function ProCard({ onFormats, onProfile }: { onFormats: () => void; onProfile: () => void }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm }}>
        <T variant="title">Take it further</T>
        <ProPill />
      </View>
      <LinkRow icon="globe" title="International formats" subtitle="LinkedIn, Canada (WES) and UK versions" onPress={onFormats} />
      <LinkRow icon="profile" title="Shareable profile" subtitle="A public page with your own link to send anyone" onPress={onProfile} />
    </Card>
  );
}

/** Shown in place of a Pro screen when it isn't unlocked. */
export function ProLocked({ feature, onBack }: { feature: string; onBack: () => void }) {
  return (
    <Card style={{ alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl }}>
      <Pill icon="lock" label="Resu-Dog Pro" tone="neutral" />
      <T variant="title" style={{ textAlign: 'center' }}>{feature} is part of Pro</T>
      <T tone="muted" style={{ textAlign: 'center' }}>Pro includes {PRO_FEATURES.join(' and ').toLowerCase()}.</T>
      <NativeButton label="Go back" variant="outlined" onPress={onBack} />
    </Card>
  );
}

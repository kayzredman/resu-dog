// Pro: the same resume reformatted for LinkedIn, Canadian (WES) applications or the UK.
// The server reformats only, and runs the same honesty check as the resume itself.

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { NativeButton, Segmented } from '@/components/native';
import { ProLocked, ProPill } from '@/components/pro';
import { Bullets, Card, Notice, Screen, T, TextAction } from '@/components/ui';
import { WorkingCard } from '@/components/working-card';
import { Spacing } from '@/constants/theme';
import { exportResume } from '@/lib/api';
import { usePro } from '@/lib/entitlements';
import { shareAsPdf } from '@/lib/pdf';
import { countPlaceholders } from '@/lib/placeholders';
import { useSession } from '@/lib/session';
import type { ExportFormat, ExportResult } from '@/lib/types';

const FORMATS: { value: ExportFormat; label: string; intro: string }[] = [
  { value: 'linkedin', label: 'LinkedIn', intro: 'A headline, About section and skills to paste into your LinkedIn profile, plus messages to ask for recommendations.' },
  { value: 'wes', label: 'Canada (WES)', intro: 'A Canadian-style CV for immigration and WES applications: full dates, education details and no photo or date of birth.' },
  { value: 'uk', label: 'UK', intro: 'A UK CV with a personal statement, reverse-order experience and nothing the Equality Act says to leave out.' },
];

export default function FormatsScreen() {
  const { proResume } = useSession();
  const { unlocked } = usePro();
  const [format, setFormat] = useState<ExportFormat>('linkedin');
  const [results, setResults] = useState<Partial<Record<ExportFormat, ExportResult>>>({});
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  if (!unlocked) return <Screen><ProLocked feature="International formats" onBack={() => router.back()} /></Screen>;
  if (!proResume) {
    return (
      <Screen>
        <T tone="muted">Open your results first, then come back here.</T>
        <NativeButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const info = FORMATS.find((f) => f.value === format)!;
  const result = results[format];
  const placeholders = countPlaceholders(proResume);

  const generate = async () => {
    setWorking(true);
    setError('');
    try {
      const res = await exportResume(proResume, format);
      setResults((r) => ({ ...r, [format]: res }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  if (working) {
    return (
      <Screen>
        <WorkingCard title={`Making your ${info.label} version`} steps={['Reading your resume', `Reformatting for ${info.label}`, 'Checking nothing was added']} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start' }}>
        <ProPill />
      </View>
      <Segmented
        accessibilityLabel="Format"
        value={format}
        onChange={(f) => {
          setFormat(f);
          setError('');
        }}
        options={FORMATS.map(({ value, label }) => ({ value, label }))}
      />
      <T tone="muted">{info.intro}</T>

      {placeholders > 0 && !result ? (
        <Notice tone="placeholder">{`Your resume still has ${placeholders} [bracket${placeholders === 1 ? '' : 's'}]. They’ll carry over, so fill them in first if you can.`}</Notice>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}

      {result ? (
        format === 'linkedin' ? <LinkedInResult result={result} /> : <CvResult result={result} label={info.label} />
      ) : (
        <NativeButton label={error ? 'Try again' : `Make my ${info.label} version`} onPress={generate} />
      )}
      {result ? <NativeButton label="Make it again" variant="text" onPress={generate} /> : null}

      <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>
        We only reformat what’s in your resume. Read it through before you use it.
      </T>
    </Screen>
  );
}

async function copy(text: string, what: string) {
  await Clipboard.setStringAsync(text);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  Alert.alert('Copied', `${what} is on the clipboard.`);
}

function CopyCard({ title, text, what }: { title: string; text: string; what: string }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <T variant="heading">{title}</T>
        <TextAction title="Copy" accessibilityLabel={`Copy ${what}`} onPress={() => copy(text, what)} />
      </View>
      <T tone="soft" selectable>{text}</T>
    </Card>
  );
}

function LinkedInResult({ result }: { result: ExportResult }) {
  return (
    <View style={{ gap: Spacing.lg }}>
      {result.headline ? <CopyCard title="Headline" text={result.headline} what="Your headline" /> : null}
      {result.about ? <CopyCard title="About" text={result.about} what="Your About section" /> : null}
      {result.skills?.length ? <CopyCard title="Skills" text={result.skills.join(', ')} what="Your skills" /> : null}
      {result.recommendation_requests?.length ? (
        <Card>
          <T variant="heading">Ask for recommendations</T>
          {result.recommendation_requests.map((r, i) => (
            <View key={i} style={{ gap: Spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <T variant="subhead" tone="primary" style={{ flex: 1 }}>{r.target}</T>
                <TextAction title="Copy" accessibilityLabel={`Copy message for ${r.target}`} onPress={() => copy(r.template, 'The message')} />
              </View>
              <T tone="soft" selectable>{r.template}</T>
            </View>
          ))}
        </Card>
      ) : null}
      {result.formatted ? <NativeButton label="Copy everything" variant="outlined" onPress={() => copy(result.formatted!, 'Your LinkedIn copy')} /> : null}
    </View>
  );
}

function CvResult({ result, label }: { result: ExportResult; label: string }) {
  const [exporting, setExporting] = useState(false);
  const text = result.formatted ?? '';
  const savePdf = async () => {
    setExporting(true);
    try {
      await shareAsPdf(text, 'resume', `Save your ${label} CV`);
    } catch (err) {
      Alert.alert('Couldn’t create the PDF', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setExporting(false);
    }
  };
  return (
    <View style={{ gap: Spacing.lg }}>
      {result.notes?.length ? (
        <Card>
          <T variant="heading">Before you send it</T>
          <Bullets items={result.notes} tone="muted" />
        </Card>
      ) : null}
      <Card>
        <T variant="title">Your {label} CV</T>
        <T tone="soft" selectable>{text}</T>
      </Card>
      <NativeButton label="Save or share PDF" onPress={savePdf} loading={exporting} />
      <NativeButton label="Copy text" variant="outlined" onPress={() => copy(text, `Your ${label} CV`)} />
    </View>
  );
}

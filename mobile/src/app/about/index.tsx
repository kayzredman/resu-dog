import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { View } from 'react-native';

import { NativeButton, NativeIcon } from '@/components/native';
import { PublishedCard } from '@/components/profile-screen';
import { Card, Screen, T } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getApiBaseUrl } from '@/lib/api';
import { useIntro } from '@/lib/intro';
import { usePublished } from '@/lib/published';

const PROMISES = [
  'No invented skills, numbers or jobs — ever.',
  'Where a number would help, we leave a [bracket] for you to fill.',
  'Scores are labelled as estimates, and we show how they’re worked out.',
];

const SCORING: [string, string, string][] = [
  ['Keyword coverage', 'Counted', 'We list the job’s key skills and count which ones your resume really contains.'],
  ['Skills alignment', 'AI estimate', 'How closely your experience matches the role, in a recruiter-style read.'],
  ['Easy for hiring software to read', 'AI estimate', 'Clean, single-column layouts that applicant tracking systems (ATS) parse reliably.'],
];

const DATA = [
  'Your resume is sent securely to our server and to OpenAI to process, then discarded. We don’t save it.',
  'OpenAI doesn’t train on it, and keeps it for at most 30 days for abuse monitoring.',
  'Results stay on this phone only until you close the app — save your PDF.',
];

export default function AboutScreen() {
  const c = useTheme();
  const base = getApiBaseUrl();
  const { replay } = useIntro();
  const { published } = usePublished();

  return (
    <Screen>
      {/* The only place to manage a live profile once the results are gone */}
      {published ? <PublishedCard published={published} /> : null}

      <Card>
        <T variant="title">Our promise</T>
        {PROMISES.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
            <NativeIcon name="check" color={c.primaryInk} />
            <T tone="soft" style={{ flex: 1 }}>{p}</T>
          </View>
        ))}
      </Card>

      <Card>
        <T variant="title">How the score works</T>
        {SCORING.map(([name, how, body]) => (
          <View key={name} style={{ gap: 2 }}>
            <T variant="heading">{name}</T>
            <T variant="overline" tone="primary">{how.toUpperCase()}</T>
            <T tone="muted">{body}</T>
          </View>
        ))}
        <T variant="footnote" tone="muted">No tool can say exactly how a particular employer will rank you. We show our working instead.</T>
      </Card>

      <Card>
        <T variant="title">Your data</T>
        {DATA.map((d) => (
          <View key={d} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
            <NativeIcon name="shield" color={c.primaryInk} />
            <T tone="soft" style={{ flex: 1 }}>{d}</T>
          </View>
        ))}
        {base ? (
          <NativeButton label="Read the privacy policy" variant="outlined" onPress={() => WebBrowser.openBrowserAsync(`${base}/privacy`)} />
        ) : null}
      </Card>

      <NativeButton label="See the welcome screen again" variant="outlined" onPress={replay} />

      <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>
        Resu-Dog {Constants.expoConfig?.version ?? ''}
        {__DEV__ && base ? `\nServer: ${base}` : ''}
      </T>
    </Screen>
  );
}

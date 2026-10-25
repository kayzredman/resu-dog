import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand';
import { InfoSheet, NativeButton, NativeIcon, Segmented } from '@/components/native';
import { Card, LinkRow, Notice, Screen, T, TextAction } from '@/components/ui';
import { WorkingCard } from '@/components/working-card';
import { BodySize, MinTouch, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { optimizeResume } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { Mode, PickedFile } from '@/lib/types';

const MAX_SIZE = 10 * 1024 * 1024;
const MIN_JD_CHARS = 50;
const MAX_JD_CHARS = 15_000;

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
};

const HELP_SECTIONS = [
  { heading: '1. Choose your resume', body: 'A PDF, Word (.docx) or text file from Files, iCloud Drive, Google Drive or Downloads. Up to 10 MB.' },
  { heading: '2. Paste the job (optional)', body: 'With a job description we tailor your resume to it and write a cover letter. Without one, we polish it for clarity and impact.' },
  { heading: '3. Fill in your real numbers', body: 'We never invent achievements. Where a number would help, you’ll see a [bracket] to fill in before you send it.' },
  { heading: 'Your data', body: 'Your resume is sent securely to be processed, then discarded — it isn’t saved. Results stay on this phone until you close the app.' },
];

export default function OptimizeScreen() {
  const c = useTheme();
  const { setOptimizeResult } = useSession();

  const [mode, setMode] = useState<Mode>('targeted');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [working, setWorking] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  // Don't let the screen sleep during a long run
  useEffect(() => {
    if (!working) return;
    activateKeepAwakeAsync('optimize').catch(() => {});
    return () => {
      deactivateKeepAwake('optimize');
    };
  }, [working]);

  const pickFile = async () => {
    // A second tap while the picker is opening would throw "picking in progress"
    if (picking) return;
    setPicking(true);
    setError('');
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({ type: Object.values(MIME_BY_EXT), copyToCacheDirectory: true });
    } catch {
      setError('Couldn’t open your files. Please try again.');
      return;
    } finally {
      setPicking(false);
    }
    if (result.canceled) return;

    const asset = result.assets[0];
    const ext = asset.name.split('.').pop()?.toLowerCase() ?? '';
    const mimeType = MIME_BY_EXT[ext] ?? asset.mimeType;
    if (!mimeType || !Object.values(MIME_BY_EXT).includes(mimeType)) {
      setError('That file type isn’t supported. Choose a PDF, Word (.docx) or text file.');
      return;
    }
    if (asset.size && asset.size > MAX_SIZE) {
      setError('That file is over the 10 MB limit. Please choose a smaller one.');
      return;
    }
    setFile({ uri: asset.uri, name: asset.name, mimeType, size: asset.size });
  };

  const onJobChange = (text: string) => {
    // Tell people when a long paste is cut, instead of silently dropping the end
    if (text.length > MAX_JD_CHARS) {
      setJobDescription(text.slice(0, MAX_JD_CHARS));
      setTruncated(true);
    } else {
      setJobDescription(text);
      setTruncated(false);
    }
  };

  const jdLength = jobDescription.trim().length;
  const needsJob = mode === 'targeted' && jdLength < MIN_JD_CHARS;
  const blocker = !file ? 'Choose your resume to continue.' : needsJob ? 'Paste the job description to continue.' : '';

  const submit = async () => {
    if (!file || blocker || working) return;
    setWorking(true);
    setError('');
    try {
      const result = await optimizeResume(file, mode, jobDescription.trim());
      setOptimizeResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push('/results');
    } catch (err) {
      // Inputs are kept, so trying again is one tap
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerLeft: () => <BrandMark size={32} />,
        headerRight: () => (
          <Pressable accessibilityRole="button" accessibilityLabel="How it works" onPress={() => setHelpOpen(true)} hitSlop={8} style={styles.headerButton}>
            <NativeIcon name="help" size={22} color={c.primaryInk} />
          </Pressable>
        ),
      }}
    />
  );

  if (working) {
    return (
      <Screen>
        {header}
        <WorkingCard
          title={mode === 'targeted' ? 'Tailoring your resume to the job' : 'Polishing your resume'}
          steps={
            mode === 'targeted'
              ? ['Reading your resume', 'Checking it against the job', 'Rewriting in the job’s language', 'Recruiter-style review', 'Writing your cover letter']
              : ['Reading your resume', 'Checking overall quality', 'Rewriting for clarity and impact', 'Recruiter-style review']
          }
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <View style={{ gap: Spacing.sm }}>
        <T variant="title" style={{ fontSize: 26, lineHeight: 31 }}>Let’s make your resume work harder.</T>
        <T tone="muted">
          {mode === 'targeted'
            ? 'We reword what you’ve really done and show you where you match. We never make anything up.'
            : 'We make what you’ve really done clearer and stronger — no job needed. We never make anything up.'}
        </T>
      </View>

      <Segmented
        accessibilityLabel="What would you like to do?"
        value={mode}
        onChange={(m) => {
          // An error from the other mode no longer applies
          setMode(m);
          setError('');
        }}
        options={[
          { value: 'targeted', label: 'For a job' },
          { value: 'general', label: 'Just polish' },
        ]}
      />

      <Card>
        <T variant="overline" tone="muted">YOUR RESUME</T>
        {file ? (
          <View style={[styles.fileRow, { borderColor: c.lineStrong, backgroundColor: c.surfaceMuted }]}>
            <NativeIcon name="file" size={22} color={c.primaryInk} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="heading" style={{ fontSize: 16 }}>{file.name}</T>
              {file.size ? <T variant="footnote" tone="muted">{formatSize(file.size)}</T> : null}
            </View>
            <TextAction title="Change" accessibilityLabel="Change resume file" onPress={pickFile} />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose your resume"
            accessibilityHint="Opens Files. PDF, Word or text, up to 10 megabytes"
            onPress={pickFile}
            style={({ pressed }) => [styles.dropZone, { borderColor: c.lineStrong, backgroundColor: pressed ? c.surfaceMuted : 'transparent' }]}>
            <NativeIcon name="upload" size={28} color={c.primaryInk} />
            <T variant="heading" tone="primary">Choose your resume</T>
            <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>
              PDF, Word or text · up to 10 MB · from Files, iCloud Drive or Google Drive
            </T>
          </Pressable>
        )}
      </Card>

      {mode === 'targeted' && (
        <Card>
          <T variant="overline" tone="muted">THE JOB</T>
          <TextInput
            value={jobDescription}
            onChangeText={onJobChange}
            placeholder="Paste the full job description — requirements, responsibilities and nice-to-haves."
            placeholderTextColor={c.textMuted}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            autoCorrect={false}
            accessibilityLabel="Job description"
            style={[styles.textArea, { color: c.text, borderColor: c.lineStrong, backgroundColor: c.background }]}
          />
          <View style={styles.spread}>
            <T variant="footnote" tone={jdLength > 0 && jdLength < MIN_JD_CHARS ? 'placeholder' : 'muted'}>
              {jdLength < MIN_JD_CHARS ? `At least ${MIN_JD_CHARS} characters` : 'Looks good'}
            </T>
            <T variant="footnote" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
              {jobDescription.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
            </T>
          </View>
          {truncated ? (
            <Notice tone="placeholder">That was longer than 15,000 characters, so we kept the first 15,000. Trim it to the requirements if you can.</Notice>
          ) : null}
        </Card>
      )}

      {error ? <Notice>{error}</Notice> : null}

      <View style={{ gap: Spacing.sm }}>
        <NativeButton
          label={error ? 'Try again' : mode === 'targeted' ? 'Check my match' : 'Polish my resume'}
          onPress={submit}
          disabled={!!blocker}
        />
        <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>
          {blocker || 'Usually 1–3 minutes · your resume isn’t saved'}
        </T>
      </View>

      <LinkRow
        icon="edit"
        title="No resume yet?"
        subtitle="Answer a few questions and we’ll write one"
        onPress={() => router.navigate('/build')}
      />

      <InfoSheet title="How Resu-Dog works" sections={HELP_SECTIONS} isPresented={helpOpen} onDismiss={() => setHelpOpen(false)} />
    </Screen>
  );
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  headerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  dropZone: {
    minHeight: 132,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  fileRow: {
    minHeight: MinTouch + 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  textArea: { minHeight: 160, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: BodySize, lineHeight: 22 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
});

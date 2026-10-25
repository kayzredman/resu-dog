import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { NativeButton } from '@/components/native';
import { Card, Notice, Screen, T } from '@/components/ui';
import { BodySize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { analyzeJob } from '@/lib/api';
import { useSession } from '@/lib/session';

const MIN_JD_CHARS = 50;
const MAX_JD_CHARS = 15_000;

export default function BuildStart() {
  const c = useTheme();
  const { buildJobDescription, setBuildJobDescription, buildAnswers, setBuildAnalysis, setBuildAnswers, setBuildResult } = useSession();
  const [loading, setLoading] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState('');

  const length = buildJobDescription.trim().length;

  const onChange = (text: string) => {
    setTruncated(text.length > MAX_JD_CHARS);
    setBuildJobDescription(text.slice(0, MAX_JD_CHARS));
  };

  const answeredCount = Object.values(buildAnswers).filter((v) => v.trim()).length;

  // New questions replace the old ones, so confirm before throwing away typed answers
  const confirmAnalyze = () => {
    if (answeredCount === 0) return analyze();
    Alert.alert(
      'Start with new questions?',
      `You’ve answered ${answeredCount} question${answeredCount === 1 ? '' : 's'}. New questions for this job will replace them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace answers', style: 'destructive', onPress: analyze },
      ]
    );
  };

  const analyze = async () => {
    setLoading(true);
    setError('');
    try {
      const analysis = await analyzeJob(buildJobDescription.trim());
      setBuildAnalysis(analysis);
      setBuildAnswers(() => ({}));
      setBuildResult(null);
      router.push('/build/questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T tone="muted">
        No resume yet? Paste the job you want. We’ll ask the questions a recruiter for that role would ask, then write your
        CV from your answers — nothing made up.
      </T>

      <Card>
        <T variant="overline" tone="muted">THE JOB</T>
        <TextInput
          value={buildJobDescription}
          onChangeText={onChange}
          placeholder="Paste the full job description — the more detail, the better the questions."
          placeholderTextColor={c.textMuted}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          autoCorrect={false}
          accessibilityLabel="Job description"
          style={[styles.textArea, { color: c.text, borderColor: c.lineStrong, backgroundColor: c.background }]}
        />
        <View style={styles.spread}>
          <T variant="footnote" tone={length > 0 && length < MIN_JD_CHARS ? 'placeholder' : 'muted'}>
            {length < MIN_JD_CHARS ? `At least ${MIN_JD_CHARS} characters` : 'Looks good'}
          </T>
          <T variant="footnote" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {buildJobDescription.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
          </T>
        </View>
        {truncated ? <Notice tone="placeholder">That was longer than 15,000 characters, so we kept the first 15,000.</Notice> : null}
      </Card>

      {error ? <Notice>{error}</Notice> : null}

      <View style={{ gap: Spacing.sm }}>
        <NativeButton label={error ? 'Try again' : 'Get my questions'} onPress={confirmAnalyze} loading={loading} disabled={length < MIN_JD_CHARS} />
        {length < MIN_JD_CHARS ? (
          <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>Paste the job description to continue.</T>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  textArea: { minHeight: 200, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: BodySize, lineHeight: 22 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
});

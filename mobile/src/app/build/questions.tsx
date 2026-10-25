import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { WorkingCard } from '@/components/working-card';
import { NativeButton } from '@/components/native';
import { Card, Notice, Pill, Screen, T, TextAction } from '@/components/ui';
import { BodySize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { assistAnswer, writeCv } from '@/lib/api';
import { useSession } from '@/lib/session';
import type { BuildQuestion } from '@/lib/types';

export default function BuildQuestions() {
  const c = useTheme();
  const { buildJobDescription, buildAnalysis: analysis, buildAnswers: answers, setBuildAnswers, setBuildResult } = useSession();
  const [assistingId, setAssistingId] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!writing) return;
    activateKeepAwakeAsync('build').catch(() => {});
    return () => {
      deactivateKeepAwake('build');
    };
  }, [writing]);

  const sections = useMemo(() => {
    const map = new Map<string, BuildQuestion[]>();
    for (const q of analysis?.questions ?? []) {
      map.set(q.section, [...(map.get(q.section) ?? []), q]);
    }
    return [...map.entries()];
  }, [analysis]);

  if (!analysis) {
    return (
      <Screen>
        <T tone="muted">Start by pasting a job description.</T>
        <NativeButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  const requiredMissing = analysis.questions.filter((q) => q.required && !answers[q.id]?.trim()).length;

  const assist = async (q: BuildQuestion) => {
    setAssistingId(q.id);
    setError('');
    try {
      const { suggestion } = await assistAnswer(analysis, q, answers);
      if (suggestion) setBuildAnswers((prev) => ({ ...prev, [q.id]: suggestion }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI help failed. Please try again.');
    } finally {
      setAssistingId(null);
    }
  };

  const build = async () => {
    setWriting(true);
    setError('');
    try {
      const result = await writeCv(buildJobDescription.trim(), answers, analysis.questions);
      setBuildResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push('/build/result');
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setWriting(false);
    }
  };

  if (writing) {
    return (
      <Screen>
        <WorkingCard
          title={`Writing your ${analysis.role_title} CV`}
          steps={['Writing from your answers', 'Recruiter-style review', 'Applying improvements', 'Scoring the final CV']}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <T variant="heading">{analysis.role_title}</T>
        <T tone="muted">
          {analysis.seniority} · {analysis.industry}
        </T>
        <View style={styles.wrap}>
          {analysis.key_skills.slice(0, 10).map((s) => <Pill key={s} label={s} tone="neutral" />)}
        </View>
        <T variant="footnote" tone="muted">
          Answer in your own words. “Help me write this” gives you a draft with [brackets] for the facts only you know.
        </T>
      </Card>

      {sections.map(([section, questions]) => (
        <View key={section} style={{ gap: Spacing.md }}>
          <T variant="footnote" tone="muted" style={styles.overline}>{section.toUpperCase()}</T>
          {questions.map((q) => (
            <Card key={q.id}>
              <View style={{ gap: 2 }}>
                <T variant="heading">{q.question}</T>
                <T variant="footnote" tone={q.required ? 'placeholder' : 'muted'}>{q.required ? 'Required' : 'Optional'}</T>
              </View>
              <TextInput
                value={answers[q.id] ?? ''}
                onChangeText={(text) => setBuildAnswers((prev) => ({ ...prev, [q.id]: text }))}
                placeholder={q.placeholder}
                placeholderTextColor={c.textMuted}
                multiline
                textAlignVertical="top"
                accessibilityLabel={q.question}
                {...inputTraits(q)}
                style={[styles.input, { color: c.text, borderColor: c.lineStrong, backgroundColor: c.background }]}
                scrollEnabled={false}
              />
              {q.section !== 'Personal Info' && (
                <TextAction
                  title={assistingId === q.id ? 'Writing a draft…' : answers[q.id]?.trim() ? 'Rewrite with AI' : 'Help me write this'}
                  onPress={() => (assistingId ? undefined : assist(q))}
                />
              )}
            </Card>
          ))}
        </View>
      ))}

      {error ? <Notice>{error}</Notice> : null}

      <NativeButton label={error ? 'Try again' : 'Build my CV'} onPress={build} disabled={requiredMissing > 0} />
      {requiredMissing > 0 && (
        <T variant="footnote" tone="muted" style={{ textAlign: 'center' }}>
          {requiredMissing} required question{requiredMissing === 1 ? '' : 's'} left to answer.
        </T>
      )}
    </Screen>
  );
}

/** Right keyboard and autofill for contact questions, so phones can fill them in. */
function inputTraits(q: BuildQuestion) {
  const text = q.question.toLowerCase();
  if (text.includes('email')) return { keyboardType: 'email-address' as const, autoCapitalize: 'none' as const, autoComplete: 'email' as const, multiline: false };
  if (text.includes('phone')) return { keyboardType: 'phone-pad' as const, autoComplete: 'tel' as const, multiline: false };
  if (text.includes('linkedin')) return { keyboardType: 'url' as const, autoCapitalize: 'none' as const, autoComplete: 'url' as const, multiline: false };
  if (text.includes('full name') || text === 'name') return { autoComplete: 'name' as const, textContentType: 'name' as const, multiline: false };
  return {};
}

const styles = StyleSheet.create({
  overline: { letterSpacing: 1, fontWeight: '700', marginTop: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  input: { minHeight: 52, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: BodySize, lineHeight: 22 },
});

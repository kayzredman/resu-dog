import { router, Stack } from 'expo-router';

import { NativeButton } from '@/components/native';
import { ResultsView } from '@/components/results';
import { Screen, T, useScrollToTop } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function ResultsScreen() {
  const { optimizeResult: result, setProResume } = useSession();
  const { ref: scrollRef, scrollToTop } = useScrollToTop();

  if (!result) {
    return (
      <Screen>
        <T tone="muted">No results yet. Check a resume first.</T>
        <NativeButton label="Back to Optimize" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen ref={scrollRef} headerInset>
      <Stack.Screen options={{ title: result.mode === 'general' ? 'Your review' : 'Your match' }} />
      <ResultsView
        mode={result.mode}
        scoreBefore={result.score_before}
        scoreAfter={result.score_after}
        assessment={result.assessment}
        resume={result.optimized_resume}
        coverLetter={result.cover_letter}
        onSectionChange={scrollToTop}
        onOpenPro={(screen, resume) => {
          setProResume(resume);
          // The profile lives in its own tab; formats open on top of the results
          if (screen === 'profile') router.navigate('/profile');
          else router.push('/formats');
        }}
        changes={result.changes_made}
      />
    </Screen>
  );
}

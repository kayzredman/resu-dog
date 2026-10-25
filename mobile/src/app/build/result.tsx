import { router } from 'expo-router';

import { NativeButton } from '@/components/native';
import { ResultsView } from '@/components/results';
import { Screen, T, useScrollToTop } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function BuildResultScreen() {
  const { buildResult: result, setProResume } = useSession();
  const { ref: scrollRef, scrollToTop } = useScrollToTop();

  if (!result) {
    return (
      <Screen>
        <T tone="muted">No CV yet. Answer the questions first.</T>
        <NativeButton label="Back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen ref={scrollRef} headerInset>
      <ResultsView
        mode="targeted"
        scoreAfter={result.score}
        assessment={result.assessment}
        resume={result.resume}
        onSectionChange={scrollToTop}
        onOpenPro={(screen, resume) => {
          setProResume(resume);
          // The profile lives in its own tab; formats open on top of the results
          if (screen === 'profile') router.navigate('/profile');
          else router.push('/build/formats');
        }}
        changes={result.improvements_applied ?? []}
      />
    </Screen>
  );
}

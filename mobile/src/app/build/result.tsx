import { router } from 'expo-router';

import { NativeButton } from '@/components/native';
import { ResultsView } from '@/components/results';
import { Screen, T, useScrollToTop } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function BuildResultScreen() {
  const { buildResult: result } = useSession();
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
        changes={result.improvements_applied ?? []}
      />
    </Screen>
  );
}

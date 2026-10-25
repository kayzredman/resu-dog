// Pro features: international CV formats and the shareable profile.
// Free for everyone during the beta. When payments go live, set EXPO_PUBLIC_PRO_UNLOCKED=false
// and plug the purchase check into usePro(); the server enforces the same rule (402 pro_required).

export const PRO_FEATURES = ['International formats', 'Shareable profile'] as const;

const BETA_UNLOCKED = process.env.EXPO_PUBLIC_PRO_UNLOCKED !== 'false';

export interface ProStatus {
  /** Whether the Pro features can be used right now. */
  unlocked: boolean;
  /** True while they're free for everyone, so the UI can say so. */
  freeInBeta: boolean;
}

export function usePro(): ProStatus {
  // TODO(payments): return { unlocked: hasActiveSubscription, freeInBeta: false } once purchases exist
  return { unlocked: BETA_UNLOCKED, freeInBeta: BETA_UNLOCKED };
}

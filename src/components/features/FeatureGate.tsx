import type { ReactNode } from 'react'
import { useFeatureFlags } from '../../hooks/useFeatureFlags'

interface FeatureGateProps {
  feature: string
  children: ReactNode
  fallback?: ReactNode
}

/**
 * FeatureGate - Conditionally render content based on feature flags
 *
 * Usage:
 * <FeatureGate feature="beta_features">
 *   <BetaComponent />
 * </FeatureGate>
 *
 * With fallback:
 * <FeatureGate feature="premium_feature" fallback={<UpgradePrompt />}>
 *   <PremiumComponent />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const { hasFeature, isLoading } = useFeatureFlags()

  // While loading, render nothing (or could render a skeleton)
  if (isLoading) {
    return null
  }

  // Check if user has the feature enabled
  if (hasFeature(feature)) {
    return <>{children}</>
  }

  // Feature not enabled, render fallback
  return <>{fallback}</>
}

/**
 * useFeatureGate - Hook version for programmatic checks
 */
export function useFeatureGate(feature: string): boolean {
  const { hasFeature, isLoading } = useFeatureFlags()

  if (isLoading) {
    return false
  }

  return hasFeature(feature)
}

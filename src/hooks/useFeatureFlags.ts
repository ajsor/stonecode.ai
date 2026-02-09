import { useContext } from 'react'
import { FeatureFlagContext } from '../contexts/FeatureFlagContext'
import type { FeatureFlagContextType } from '../contexts/FeatureFlagContext'

export function useFeatureFlags(): FeatureFlagContextType {
  const context = useContext(FeatureFlagContext)

  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider')
  }

  return context
}

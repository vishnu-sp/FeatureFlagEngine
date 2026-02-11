import {
  FeatureFlagData,
  FlagOverrides,
  EvaluationContext,
  EvaluationResult,
} from './types';

/**
 * Evaluates whether a feature flag is enabled for a given context.
 *
 * Precedence (highest to lowest):
 *   1. User-specific override
 *   2. Group-specific override (first matching group wins)
 *   3. Region-specific override
 *   4. Global default
 *
 */
export function evaluateFlag(
  flag: FeatureFlagData,
  overrides: FlagOverrides,
  context: EvaluationContext,
): EvaluationResult {
  if (context.userId && overrides.userOverrides[context.userId] !== undefined) {
    return {
      enabled: overrides.userOverrides[context.userId],
      reason: 'user_override',
    };
  }
  if (context.groups?.length) {
    for (const group of context.groups) {
      if (overrides.groupOverrides[group] !== undefined) {
        return {
          enabled: overrides.groupOverrides[group],
          reason: 'group_override',
        };
      }
    }
  }

  if (
    context.region &&
    overrides.regionOverrides?.[context.region] !== undefined
  ) {
    return {
      enabled: overrides.regionOverrides[context.region],
      reason: 'region_override',
    };
  }

  return {
    enabled: flag.isEnabled,
    reason: 'default',
  };
}

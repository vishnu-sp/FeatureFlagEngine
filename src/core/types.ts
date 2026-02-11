export interface FeatureFlagData {
  key: string;
  isEnabled: boolean;
}

export interface FlagOverrides {
  userOverrides: Record<string, boolean>;
  groupOverrides: Record<string, boolean>;
  regionOverrides?: Record<string, boolean>;
}

export interface EvaluationContext {
  userId?: string;
  groups?: string[];
  region?: string;
}

export interface EvaluationResult {
  enabled: boolean;
  reason: 'user_override' | 'group_override' | 'region_override' | 'default';
}

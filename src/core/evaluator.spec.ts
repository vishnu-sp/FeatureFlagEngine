import { evaluateFlag } from './evaluator';
import { FeatureFlagData, FlagOverrides, EvaluationContext } from './types';

describe('evaluateFlag', () => {
  const enabledFlag: FeatureFlagData = { key: 'test-flag', isEnabled: true };
  const disabledFlag: FeatureFlagData = { key: 'test-flag', isEnabled: false };

  const emptyOverrides: FlagOverrides = {
    userOverrides: {},
    groupOverrides: {},
    regionOverrides: {},
  };

  // --- Global default behaviour ---

  describe('global default', () => {
    it('should return true when flag is globally enabled and no overrides exist', () => {
      const result = evaluateFlag(enabledFlag, emptyOverrides, {});
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should return false when flag is globally disabled and no overrides exist', () => {
      const result = evaluateFlag(disabledFlag, emptyOverrides, {});
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('default');
    });

    it('should use default when context has userId but no matching override', () => {
      const result = evaluateFlag(enabledFlag, emptyOverrides, {
        userId: 'user-123',
      });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should use default when context has groups but none have overrides', () => {
      const result = evaluateFlag(enabledFlag, emptyOverrides, {
        groups: ['beta-testers'],
      });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });
  });

  // --- User override precedence ---

  describe('user overrides', () => {
    it('should enable flag via user override even when global is disabled', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': true },
        groupOverrides: {},
      };
      const result = evaluateFlag(disabledFlag, overrides, {
        userId: 'user-1',
      });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('user_override');
    });

    it('should disable flag via user override even when global is enabled', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': false },
        groupOverrides: {},
      };
      const result = evaluateFlag(enabledFlag, overrides, { userId: 'user-1' });
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('user_override');
    });

    it('should take priority over group override', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': false },
        groupOverrides: { beta: true },
      };
      const context: EvaluationContext = {
        userId: 'user-1',
        groups: ['beta'],
      };
      const result = evaluateFlag(enabledFlag, overrides, context);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('user_override');
    });

    it('should take priority over region override', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': true },
        groupOverrides: {},
        regionOverrides: { eu: false },
      };
      const context: EvaluationContext = {
        userId: 'user-1',
        region: 'eu',
      };
      const result = evaluateFlag(disabledFlag, overrides, context);
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('user_override');
    });
  });

  // --- Group override precedence ---

  describe('group overrides', () => {
    it('should enable flag via group override when no user override exists', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: { beta: true },
      };
      const result = evaluateFlag(disabledFlag, overrides, {
        groups: ['beta'],
      });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('group_override');
    });

    it('should use first matching group when user belongs to multiple groups', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: { alpha: false, beta: true },
      };
      // alpha comes first in the array, so it wins
      const result = evaluateFlag(enabledFlag, overrides, {
        groups: ['alpha', 'beta'],
      });
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('group_override');
    });

    it('should skip groups without overrides and match the next one', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: { beta: true },
      };
      const result = evaluateFlag(disabledFlag, overrides, {
        groups: ['alpha', 'beta'],
      });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('group_override');
    });

    it('should take priority over region override', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: { beta: false },
        regionOverrides: { us: true },
      };
      const context: EvaluationContext = {
        groups: ['beta'],
        region: 'us',
      };
      const result = evaluateFlag(enabledFlag, overrides, context);
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('group_override');
    });
  });

  // --- Region override precedence ---

  describe('region overrides', () => {
    it('should enable flag via region override when no user/group overrides exist', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: {},
        regionOverrides: { eu: true },
      };
      const result = evaluateFlag(disabledFlag, overrides, { region: 'eu' });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('region_override');
    });

    it('should fall back to default when region has no override', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: {},
        regionOverrides: { eu: true },
      };
      const result = evaluateFlag(disabledFlag, overrides, { region: 'us' });
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('default');
    });

    it('should work when regionOverrides is undefined', () => {
      const overrides: FlagOverrides = {
        userOverrides: {},
        groupOverrides: {},
      };
      const result = evaluateFlag(enabledFlag, overrides, { region: 'eu' });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });
  });

  // --- Edge cases ---

  describe('edge cases', () => {
    it('should handle empty context object', () => {
      const result = evaluateFlag(enabledFlag, emptyOverrides, {});
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should handle empty groups array', () => {
      const result = evaluateFlag(enabledFlag, emptyOverrides, { groups: [] });
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should handle undefined userId in context', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': true },
        groupOverrides: {},
      };
      const result = evaluateFlag(disabledFlag, overrides, {});
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('default');
    });

    it('should handle override set to false explicitly', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': false },
        groupOverrides: {},
      };
      const result = evaluateFlag(enabledFlag, overrides, { userId: 'user-1' });
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('user_override');
    });

    it('should handle full context with all override levels', () => {
      const overrides: FlagOverrides = {
        userOverrides: { 'user-1': true },
        groupOverrides: { beta: false },
        regionOverrides: { eu: false },
      };
      const context: EvaluationContext = {
        userId: 'user-1',
        groups: ['beta'],
        region: 'eu',
      };
      // User override should win
      const result = evaluateFlag(disabledFlag, overrides, context);
      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('user_override');
    });
  });
});

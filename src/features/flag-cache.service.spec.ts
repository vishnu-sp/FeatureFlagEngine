/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { FlagCacheService } from './flag-cache.service';

describe('FlagCacheService', () => {
  let cache: FlagCacheService;

  beforeEach(() => {
    cache = new FlagCacheService();
  });

  const flag = { key: 'dark-mode', isEnabled: true };
  const overrides = {
    userOverrides: { 'user-1': true },
    groupOverrides: {},
    regionOverrides: {},
  };

  it('should return null for unknown key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should store and retrieve a flag', () => {
    cache.set('dark-mode', flag, overrides);

    const cached = cache.get('dark-mode');
    expect(cached).not.toBeNull();
    expect(cached!.flag).toEqual(flag);
    expect(cached!.overrides).toEqual(overrides);
  });

  it('should invalidate a specific key', () => {
    cache.set('dark-mode', flag, overrides);
    cache.invalidate('dark-mode');

    expect(cache.get('dark-mode')).toBeNull();
  });

  it('should clear all entries', () => {
    cache.set('dark-mode', flag, overrides);
    cache.set(
      'new-feature',
      { key: 'new-feature', isEnabled: false },
      overrides,
    );

    cache.clear();

    expect(cache.get('dark-mode')).toBeNull();
    expect(cache.get('new-feature')).toBeNull();
  });

  it('should return null for expired entries', () => {
    cache.set('dark-mode', flag, overrides);

    // Manually expire the entry by manipulating cachedAt
    const entry = (cache as any).cache.get('dark-mode');
    entry.cachedAt = Date.now() - 60_000; // 60 seconds ago

    expect(cache.get('dark-mode')).toBeNull();
  });
});

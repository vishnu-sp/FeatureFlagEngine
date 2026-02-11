import { Injectable } from '@nestjs/common';
import { FlagOverrides, FeatureFlagData } from '../core/types';

interface CachedFlag {
  flag: FeatureFlagData;
  overrides: FlagOverrides;
  cachedAt: number;
}

@Injectable()
export class FlagCacheService {
  private cache = new Map<string, CachedFlag>();
  private readonly ttlMs: number;

  constructor() {
    this.ttlMs = 30_000;
  }

  get(key: string): CachedFlag | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, flag: FeatureFlagData, overrides: FlagOverrides): void {
    this.cache.set(key, { flag, overrides, cachedAt: Date.now() });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

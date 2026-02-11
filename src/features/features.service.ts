import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FlagCacheService } from './flag-cache.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { EvaluateContextDto } from './dto/evaluate-context.dto';
import { evaluateFlag } from '../core/evaluator';
import { FlagOverrides } from '../core/types';

@Injectable()
export class FeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: FlagCacheService,
  ) {}

  async create(dto: CreateFeatureDto) {
    const existing = await this.prisma.featureFlag.findUnique({
      where: { key: dto.key },
    });

    if (existing) {
      throw new ConflictException(`Feature flag "${dto.key}" already exists`);
    }

    return this.prisma.featureFlag.create({
      data: {
        key: dto.key,
        description: dto.description,
        isEnabled: dto.isEnabled,
      },
    });
  }

  async findAll() {
    return this.prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      include: {
        userOverrides: true,
        groupOverrides: true,
        regionOverrides: true,
      },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    return flag;
  }

  async update(key: string, dto: UpdateFeatureDto) {
    await this.ensureFlagExists(key);

    const result = await this.prisma.featureFlag.update({
      where: { key },
      data: dto,
    });

    this.cache.invalidate(key);
    return result;
  }

  async remove(key: string) {
    await this.ensureFlagExists(key);

    const result = await this.prisma.featureFlag.delete({ where: { key } });
    this.cache.invalidate(key);
    return result;
  }

  // --- Override management ---

  async setUserOverride(key: string, userId: string, isEnabled: boolean) {
    const flag = await this.ensureFlagExists(key);

    const result = await this.prisma.userOverride.upsert({
      where: {
        featureFlagId_userId: {
          featureFlagId: flag.id,
          userId,
        },
      },
      update: { isEnabled },
      create: {
        featureFlagId: flag.id,
        userId,
        isEnabled,
      },
    });

    this.cache.invalidate(key);
    return result;
  }

  async removeUserOverride(key: string, userId: string) {
    const flag = await this.ensureFlagExists(key);

    const override = await this.prisma.userOverride.findUnique({
      where: {
        featureFlagId_userId: {
          featureFlagId: flag.id,
          userId,
        },
      },
    });

    if (!override) {
      throw new NotFoundException(
        `No user override found for user "${userId}" on flag "${key}"`,
      );
    }

    const result = await this.prisma.userOverride.delete({
      where: { id: override.id },
    });

    this.cache.invalidate(key);
    return result;
  }

  async setGroupOverride(key: string, groupName: string, isEnabled: boolean) {
    const flag = await this.ensureFlagExists(key);

    const result = await this.prisma.groupOverride.upsert({
      where: {
        featureFlagId_groupName: {
          featureFlagId: flag.id,
          groupName,
        },
      },
      update: { isEnabled },
      create: {
        featureFlagId: flag.id,
        groupName,
        isEnabled,
      },
    });

    this.cache.invalidate(key);
    return result;
  }

  async removeGroupOverride(key: string, groupName: string) {
    const flag = await this.ensureFlagExists(key);

    const override = await this.prisma.groupOverride.findUnique({
      where: {
        featureFlagId_groupName: {
          featureFlagId: flag.id,
          groupName,
        },
      },
    });

    if (!override) {
      throw new NotFoundException(
        `No group override found for group "${groupName}" on flag "${key}"`,
      );
    }

    const result = await this.prisma.groupOverride.delete({
      where: { id: override.id },
    });

    this.cache.invalidate(key);
    return result;
  }

  async setRegionOverride(key: string, region: string, isEnabled: boolean) {
    const flag = await this.ensureFlagExists(key);

    const result = await this.prisma.regionOverride.upsert({
      where: {
        featureFlagId_region: {
          featureFlagId: flag.id,
          region,
        },
      },
      update: { isEnabled },
      create: {
        featureFlagId: flag.id,
        region,
        isEnabled,
      },
    });

    this.cache.invalidate(key);
    return result;
  }

  async removeRegionOverride(key: string, region: string) {
    const flag = await this.ensureFlagExists(key);

    const override = await this.prisma.regionOverride.findUnique({
      where: {
        featureFlagId_region: {
          featureFlagId: flag.id,
          region,
        },
      },
    });

    if (!override) {
      throw new NotFoundException(
        `No region override found for region "${region}" on flag "${key}"`,
      );
    }

    const result = await this.prisma.regionOverride.delete({
      where: { id: override.id },
    });

    this.cache.invalidate(key);
    return result;
  }

  // --- Evaluation ---

  async evaluate(key: string, context: EvaluateContextDto) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached) {
      return evaluateFlag(cached.flag, cached.overrides, context);
    }

    // Cache miss - fetch from DB
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      include: {
        userOverrides: true,
        groupOverrides: true,
        regionOverrides: true,
      },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    const flagData = { key: flag.key, isEnabled: flag.isEnabled };
    const overrides: FlagOverrides = {
      userOverrides: Object.fromEntries(
        flag.userOverrides.map((o) => [o.userId, o.isEnabled]),
      ),
      groupOverrides: Object.fromEntries(
        flag.groupOverrides.map((o) => [o.groupName, o.isEnabled]),
      ),
      regionOverrides: Object.fromEntries(
        flag.regionOverrides.map((o) => [o.region, o.isEnabled]),
      ),
    };

    // Populate cache for subsequent evaluations
    this.cache.set(key, flagData, overrides);

    return evaluateFlag(flagData, overrides, context);
  }

  // --- Helpers ---

  private async ensureFlagExists(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      throw new NotFoundException(`Feature flag "${key}" not found`);
    }

    return flag;
  }
}

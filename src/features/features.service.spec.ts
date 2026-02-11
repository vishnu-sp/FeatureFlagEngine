/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { PrismaService } from '../prisma/prisma.service';
import { FlagCacheService } from './flag-cache.service';

// Helper to build a mock flag object
function mockFlag(overrides: Partial<any> = {}) {
  return {
    id: 'flag-uuid-1',
    key: 'dark-mode',
    description: 'Enable dark mode',
    isEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('FeaturesService', () => {
  let service: FeaturesService;
  let prisma: any;
  let cache: FlagCacheService;

  beforeEach(async () => {
    // Create a mock PrismaService with the methods we use
    prisma = {
      featureFlag: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userOverride: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      groupOverride: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      regionOverride: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeaturesService,
        FlagCacheService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FeaturesService>(FeaturesService);
    cache = module.get<FlagCacheService>(FlagCacheService);
  });

  // --- Create ---

  describe('create', () => {
    it('should create a new feature flag', async () => {
      const dto = { key: 'dark-mode', isEnabled: false, description: 'test' };
      prisma.featureFlag.findUnique.mockResolvedValue(null);
      prisma.featureFlag.create.mockResolvedValue(mockFlag());

      const result = await service.create(dto);

      expect(prisma.featureFlag.create).toHaveBeenCalledWith({
        data: { key: 'dark-mode', isEnabled: false, description: 'test' },
      });
      expect(result.key).toBe('dark-mode');
    });

    it('should throw ConflictException for duplicate key', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());

      await expect(
        service.create({ key: 'dark-mode', isEnabled: false }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // --- Find ---

  describe('findAll', () => {
    it('should return all feature flags', async () => {
      const flags = [mockFlag(), mockFlag({ key: 'beta-feature' })];
      prisma.featureFlag.findMany.mockResolvedValue(flags);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(prisma.featureFlag.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return a flag with its overrides', async () => {
      const flag = {
        ...mockFlag(),
        userOverrides: [],
        groupOverrides: [],
        regionOverrides: [],
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);

      const result = await service.findOne('dark-mode');

      expect(result.key).toBe('dark-mode');
      expect(prisma.featureFlag.findUnique).toHaveBeenCalledWith({
        where: { key: 'dark-mode' },
        include: {
          userOverrides: true,
          groupOverrides: true,
          regionOverrides: true,
        },
      });
    });

    it('should throw NotFoundException for unknown key', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  // --- Update ---

  describe('update', () => {
    it('should update the global state and invalidate cache', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.featureFlag.update.mockResolvedValue(
        mockFlag({ isEnabled: true }),
      );
      const invalidateSpy = jest.spyOn(cache, 'invalidate');

      const result = await service.update('dark-mode', { isEnabled: true });

      expect(result.isEnabled).toBe(true);
      expect(invalidateSpy).toHaveBeenCalledWith('dark-mode');
    });

    it('should throw NotFoundException if flag does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.update('nope', { isEnabled: true })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // --- Delete ---

  describe('remove', () => {
    it('should delete an existing flag and invalidate cache', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.featureFlag.delete.mockResolvedValue(mockFlag());
      const invalidateSpy = jest.spyOn(cache, 'invalidate');

      await service.remove('dark-mode');

      expect(prisma.featureFlag.delete).toHaveBeenCalledWith({
        where: { key: 'dark-mode' },
      });
      expect(invalidateSpy).toHaveBeenCalledWith('dark-mode');
    });

    it('should throw NotFoundException for unknown flag', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
    });
  });

  // --- User overrides ---

  describe('setUserOverride', () => {
    it('should upsert a user override and invalidate cache', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.userOverride.upsert.mockResolvedValue({ isEnabled: true });
      const invalidateSpy = jest.spyOn(cache, 'invalidate');

      await service.setUserOverride('dark-mode', 'user-1', true);

      expect(prisma.userOverride.upsert).toHaveBeenCalledWith({
        where: {
          featureFlagId_userId: {
            featureFlagId: 'flag-uuid-1',
            userId: 'user-1',
          },
        },
        update: { isEnabled: true },
        create: {
          featureFlagId: 'flag-uuid-1',
          userId: 'user-1',
          isEnabled: true,
        },
      });
      expect(invalidateSpy).toHaveBeenCalledWith('dark-mode');
    });

    it('should throw NotFoundException when flag does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        service.setUserOverride('nope', 'user-1', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeUserOverride', () => {
    it('should remove an existing user override', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.userOverride.findUnique.mockResolvedValue({ id: 'override-1' });
      prisma.userOverride.delete.mockResolvedValue({});

      await service.removeUserOverride('dark-mode', 'user-1');

      expect(prisma.userOverride.delete).toHaveBeenCalledWith({
        where: { id: 'override-1' },
      });
    });

    it('should throw NotFoundException if override does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.userOverride.findUnique.mockResolvedValue(null);

      await expect(
        service.removeUserOverride('dark-mode', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Group overrides ---

  describe('setGroupOverride', () => {
    it('should upsert a group override', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.groupOverride.upsert.mockResolvedValue({ isEnabled: true });

      await service.setGroupOverride('dark-mode', 'beta', true);

      expect(prisma.groupOverride.upsert).toHaveBeenCalledWith({
        where: {
          featureFlagId_groupName: {
            featureFlagId: 'flag-uuid-1',
            groupName: 'beta',
          },
        },
        update: { isEnabled: true },
        create: {
          featureFlagId: 'flag-uuid-1',
          groupName: 'beta',
          isEnabled: true,
        },
      });
    });
  });

  describe('removeGroupOverride', () => {
    it('should throw NotFoundException if override does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.groupOverride.findUnique.mockResolvedValue(null);

      await expect(
        service.removeGroupOverride('dark-mode', 'beta'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Region overrides ---

  describe('setRegionOverride', () => {
    it('should upsert a region override and invalidate cache', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.regionOverride.upsert.mockResolvedValue({ isEnabled: true });
      const invalidateSpy = jest.spyOn(cache, 'invalidate');

      await service.setRegionOverride('dark-mode', 'eu', true);

      expect(prisma.regionOverride.upsert).toHaveBeenCalledWith({
        where: {
          featureFlagId_region: {
            featureFlagId: 'flag-uuid-1',
            region: 'eu',
          },
        },
        update: { isEnabled: true },
        create: {
          featureFlagId: 'flag-uuid-1',
          region: 'eu',
          isEnabled: true,
        },
      });
      expect(invalidateSpy).toHaveBeenCalledWith('dark-mode');
    });

    it('should throw NotFoundException when flag does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(
        service.setRegionOverride('nope', 'eu', true),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeRegionOverride', () => {
    it('should remove an existing region override', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.regionOverride.findUnique.mockResolvedValue({ id: 'override-1' });
      prisma.regionOverride.delete.mockResolvedValue({});

      await service.removeRegionOverride('dark-mode', 'eu');

      expect(prisma.regionOverride.delete).toHaveBeenCalledWith({
        where: { id: 'override-1' },
      });
    });

    it('should throw NotFoundException if override does not exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(mockFlag());
      prisma.regionOverride.findUnique.mockResolvedValue(null);

      await expect(
        service.removeRegionOverride('dark-mode', 'eu'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // --- Evaluate ---

  describe('evaluate', () => {
    it('should return evaluation result using the core evaluator', async () => {
      const flag = {
        ...mockFlag({ isEnabled: false }),
        userOverrides: [{ userId: 'user-1', isEnabled: true }],
        groupOverrides: [],
        regionOverrides: [],
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);

      const result = await service.evaluate('dark-mode', {
        userId: 'user-1',
      });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('user_override');
    });

    it('should fall back to global default when no overrides match', async () => {
      const flag = {
        ...mockFlag({ isEnabled: true }),
        userOverrides: [],
        groupOverrides: [],
        regionOverrides: [],
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);

      const result = await service.evaluate('dark-mode', {});

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('default');
    });

    it('should throw NotFoundException for unknown flag', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      await expect(service.evaluate('nope', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should use cached data on second evaluation', async () => {
      const flag = {
        ...mockFlag({ isEnabled: true }),
        userOverrides: [],
        groupOverrides: [],
        regionOverrides: [],
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);

      // First call - populates cache
      await service.evaluate('dark-mode', {});
      // Second call - should use cache
      await service.evaluate('dark-mode', {});

      // DB should only be called once
      expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should use region override when no user/group overrides match', async () => {
      const flag = {
        ...mockFlag({ isEnabled: false }),
        userOverrides: [],
        groupOverrides: [],
        regionOverrides: [{ region: 'eu', isEnabled: true }],
      };
      prisma.featureFlag.findUnique.mockResolvedValue(flag);

      const result = await service.evaluate('dark-mode', { region: 'eu' });

      expect(result.enabled).toBe(true);
      expect(result.reason).toBe('region_override');
    });
  });
});

import { Module } from '@nestjs/common';
import { FeaturesController } from './features.controller';
import { FeaturesService } from './features.service';
import { FlagCacheService } from './flag-cache.service';

@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService, FlagCacheService],
  exports: [FeaturesService],
})
export class FeaturesModule {}

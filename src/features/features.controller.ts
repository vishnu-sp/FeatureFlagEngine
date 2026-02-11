import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
import { SetOverrideDto } from './dto/set-override.dto';
import { EvaluateContextDto } from './dto/evaluate-context.dto';

@ApiTags('features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  // --- Feature CRUD ---

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({ status: 201, description: 'Feature flag created' })
  @ApiResponse({ status: 409, description: 'Feature flag key already exists' })
  create(@Body() dto: CreateFeatureDto) {
    return this.featuresService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all feature flags' })
  findAll() {
    return this.featuresService.findAll();
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a feature flag by key (includes overrides)' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  findOne(@Param('key') key: string) {
    return this.featuresService.findOne(key);
  }

  @Patch(':key')
  @ApiOperation({
    summary: 'Update a feature flag (global state or description)',
  })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  update(@Param('key') key: string, @Body() dto: UpdateFeatureDto) {
    return this.featuresService.update(key, dto);
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a feature flag' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  remove(@Param('key') key: string) {
    return this.featuresService.remove(key);
  }

  // --- User overrides ---

  @Put(':key/overrides/users/:userId')
  @ApiOperation({ summary: 'Set a user-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'userId', example: 'user-123' })
  setUserOverride(
    @Param('key') key: string,
    @Param('userId') userId: string,
    @Body() dto: SetOverrideDto,
  ) {
    return this.featuresService.setUserOverride(key, userId, dto.isEnabled);
  }

  @Delete(':key/overrides/users/:userId')
  @ApiOperation({ summary: 'Remove a user-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'userId', example: 'user-123' })
  @ApiResponse({ status: 200, description: 'Override removed' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  removeUserOverride(
    @Param('key') key: string,
    @Param('userId') userId: string,
  ) {
    return this.featuresService.removeUserOverride(key, userId);
  }

  // --- Group overrides ---

  @Put(':key/overrides/groups/:groupName')
  @ApiOperation({ summary: 'Set a group-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'groupName', example: 'beta-testers' })
  setGroupOverride(
    @Param('key') key: string,
    @Param('groupName') groupName: string,
    @Body() dto: SetOverrideDto,
  ) {
    return this.featuresService.setGroupOverride(key, groupName, dto.isEnabled);
  }

  @Delete(':key/overrides/groups/:groupName')
  @ApiOperation({ summary: 'Remove a group-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'groupName', example: 'beta-testers' })
  @ApiResponse({ status: 200, description: 'Override removed' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  removeGroupOverride(
    @Param('key') key: string,
    @Param('groupName') groupName: string,
  ) {
    return this.featuresService.removeGroupOverride(key, groupName);
  }

  // --- Region overrides ---

  @Put(':key/overrides/regions/:region')
  @ApiOperation({ summary: 'Set a region-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'region', example: 'eu' })
  setRegionOverride(
    @Param('key') key: string,
    @Param('region') region: string,
    @Body() dto: SetOverrideDto,
  ) {
    return this.featuresService.setRegionOverride(key, region, dto.isEnabled);
  }

  @Delete(':key/overrides/regions/:region')
  @ApiOperation({ summary: 'Remove a region-level override' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiParam({ name: 'region', example: 'eu' })
  @ApiResponse({ status: 200, description: 'Override removed' })
  @ApiResponse({ status: 404, description: 'Override not found' })
  removeRegionOverride(
    @Param('key') key: string,
    @Param('region') region: string,
  ) {
    return this.featuresService.removeRegionOverride(key, region);
  }

  // --- Evaluation ---

  @Post(':key/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate a feature flag for a given context' })
  @ApiParam({ name: 'key', example: 'dark-mode' })
  @ApiResponse({ status: 200, description: 'Evaluation result' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  evaluate(@Param('key') key: string, @Body() context: EvaluateContextDto) {
    return this.featuresService.evaluate(key, context);
  }
}

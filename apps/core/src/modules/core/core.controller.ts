import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CoreService } from './core.service';
import { JwtAuthGuard } from '@heidi/jwt';
import { CityContextService } from '@heidi/tenancy';
import {
  CoreOperationRequestDto,
  CoreOperationResponseDto,
  CoreStatusResponseDto,
  UnauthorizedErrorResponseDto,
  ValidationErrorResponseDto,
  ParkingSpacesResponseDto,
} from '@heidi/contracts';

@ApiTags('core')
@Controller()
@UseGuards(JwtAuthGuard)
export class CoreController {
  constructor(
    private readonly coreService: CoreService,
    private readonly cityContextService: CityContextService,
  ) {}

  @Get('status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get core service status',
    description:
      'Retrieve current uptime, timestamp, and process memory usage for the core microservice.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    type: CoreStatusResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  getStatus() {
    return this.coreService.getStatus();
  }

  @Post('operations')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Queue core operation',
    description:
      'Queue an asynchronous core operation that will be broadcast via RabbitMQ to downstream services.',
  })
  @ApiBody({
    type: CoreOperationRequestDto,
    examples: {
      syncAssignments: {
        summary: 'Queue synchronization',
        value: {
          operation: 'sync.cityAssignments',
          payload: {
            cityId: 'city_01HZXTY0YK3H2V4C5B6N7P8Q',
            force: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: 'Operation accepted for processing',
    type: CoreOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid operation payload',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/operations',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'operation should not be empty',
              'operation must be a string',
              'payload must be an object',
            ],
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.ACCEPTED)
  executeOperation(@Body() payload: CoreOperationRequestDto) {
    return this.coreService.executeOperation(payload);
  }

  @Get('parking/spaces')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get parking spaces for a city',
    description:
      'Returns list of parking spaces with capacity utilization, status, and location. Requires parking feature to be enabled for the city. ' +
      'Parking space names and descriptions are returned in the requested language when translations exist.',
  })
  @ApiQuery({
    name: 'cityId',
    required: false,
    description: 'City ID (optional, uses city context if not provided)',
    example: 'city_01HZXTY0YK3H2V4C5B6N7P8Q',
  })
  @ApiResponse({
    status: 200,
    description: 'Parking spaces retrieved successfully',
    type: ParkingSpacesResponseDto,
  })
  @ApiHeader({
    name: 'Accept-Language',
    required: false,
    description:
      'Preferred response language (e.g. de, en, dk). When set (or when selected via the Swagger language selector), parking space names and descriptions are translated where translations exist.',
    example: 'de',
  })
  @ApiResponse({
    status: 400,
    description: 'City ID is required',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Parking feature not enabled for this city',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  async getParkingSpaces(@Query('cityId') cityId?: string) {
    const contextCityId = this.cityContextService.getCityId();
    const targetCityId = cityId || contextCityId;

    if (!targetCityId) {
      throw new BadRequestException('City ID is required');
    }

    try {
      const spaces = await this.coreService.getParkingSpaces(targetCityId);

      // Get last sync time from the first space or current time
      const lastSyncAt =
        spaces.length > 0 && spaces[0].lastUpdate
          ? new Date(spaces[0].lastUpdate).toISOString()
          : new Date().toISOString();

      return {
        spaces,
        lastSyncAt,
        total: spaces.length,
      };
    } catch (error: any) {
      if (error.message?.includes('not enabled')) {
        throw new ForbiddenException('Parking feature is not enabled for this city');
      }
      throw error;
    }
  }
}

import { Body, Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CoreService } from './core.service';
import { JwtAuthGuard } from '@heidi/jwt';
import {
  CoreOperationRequestDto,
  CoreOperationResponseDto,
  CoreStatusResponseDto,
  UnauthorizedErrorResponseDto,
  ValidationErrorResponseDto,
} from '@heidi/contracts';

@ApiTags('core')
@Controller()
@UseGuards(JwtAuthGuard)
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

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
}

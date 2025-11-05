import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CoreService } from './core.service';
import { GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import {
  ValidationErrorResponseDto,
  NotFoundErrorResponseDto,
  UnauthorizedErrorResponseDto,
} from '@heidi/contracts';

@ApiTags('core')
@Controller()
@UseGuards(JwtAuthGuard)
export class CoreController {
  constructor(private readonly coreService: CoreService) {}

  @Get('status')
  getStatus() {
    return this.coreService.getStatus();
  }

  @Post('operations')
  executeOperation(@Body() payload: any) {
    return this.coreService.executeOperation(payload);
  }

  @Post('favorites')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add listing to favorites',
    description:
      "Add a listing to the current user's favorites (works for both guest and registered users)",
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        listingId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['listingId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Listing added to favorites successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or listing not found',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@GetCurrentUser('userId') userId: string, @Body() body: { listingId: string }) {
    return this.coreService.addFavorite(userId, body.listingId);
  }

  @Delete('favorites/:listingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove listing from favorites',
    description: "Remove a listing from the current user's favorites",
  })
  @ApiParam({
    name: 'listingId',
    description: 'Listing ID to remove from favorites',
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing removed from favorites successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Favorite not found',
    type: NotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @GetCurrentUser('userId') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.coreService.removeFavorite(userId, listingId);
  }

  @Get('favorites')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user favorites',
    description:
      'Get all favorites for the current user (works for both guest and registered users)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user favorites retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getUserFavorites(@GetCurrentUser('userId') userId: string) {
    return this.coreService.getUserFavorites(userId);
  }
}

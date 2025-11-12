import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
import {
  AddFavoriteDto,
  AddFavoriteResponseDto,
  BadRequestErrorResponseDto,
  FavoriteListingDto,
  ListingNotFoundErrorResponseDto,
  FavoriteNotFoundErrorResponseDto,
  RemoveFavoriteResponseDto,
  UnauthorizedErrorResponseDto,
  ValidationErrorResponseDto,
} from '@heidi/contracts';
import { ListingsService } from './listings.service';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add listing to favorites',
    description:
      "Add a listing to the current user's favorites (works for both guest and registered users)",
  })
  @ApiBody({
    type: AddFavoriteDto,
    examples: {
      default: {
        summary: 'Add listing to favorites',
        value: {
          listingId: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Listing added to favorites successfully',
    type: AddFavoriteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation failed or listing already favorited',
    type: ValidationErrorResponseDto,
    content: {
      'application/json': {
        example: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/favorites',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: ['listingId must be a UUID', 'listingId should not be empty'],
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
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
    type: ListingNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@GetCurrentUser('userId') userId: string, @Body() body: AddFavoriteDto) {
    return this.listingsService.addFavorite(userId, body.listingId);
  }

  @Delete(':listingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove listing from favorites',
    description: "Remove a listing from the current user's favorites",
  })
  @ApiParam({
    name: 'listingId',
    description: 'Listing identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing removed from favorites successfully',
    type: RemoveFavoriteResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Favorite not found',
    type: FavoriteNotFoundErrorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    type: BadRequestErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async removeFavorite(
    @GetCurrentUser('userId') userId: string,
    @Param('listingId') listingId: string,
  ) {
    return this.listingsService.removeFavorite(userId, listingId);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user favorites',
    description:
      'Get all favorites for the current user (works for both guest and registered users)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user favorites retrieved successfully',
    type: FavoriteListingDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
    type: UnauthorizedErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async getUserFavorites(@GetCurrentUser('userId') userId: string) {
    return this.listingsService.getUserFavorites(userId);
  }
}

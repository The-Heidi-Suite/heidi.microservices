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
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetCurrentUser, JwtAuthGuard } from '@heidi/jwt';
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
  })
  @HttpCode(HttpStatus.CREATED)
  async addFavorite(@GetCurrentUser('userId') userId: string, @Body() body: { listingId: string }) {
    return this.listingsService.addFavorite(userId, body.listingId);
  }

  @Delete(':listingId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Remove listing from favorites',
    description: "Remove a listing from the current user's favorites",
  })
  @ApiResponse({
    status: 200,
    description: 'Listing removed from favorites successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Favorite not found',
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
  })
  @HttpCode(HttpStatus.OK)
  async getUserFavorites(@GetCurrentUser('userId') userId: string) {
    return this.listingsService.getUserFavorites(userId);
  }
}

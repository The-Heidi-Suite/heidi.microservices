import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CityService } from './city.service';
import {
  CreateCityDto,
  UpdateCityDto,
  ListCitiesResponseDto,
  GetCityResponseDto,
  CreateCityResponseDto,
  UpdateCityResponseDto,
  DeleteCityResponseDto,
  CityNotFoundErrorResponseDto,
  ValidationErrorResponseDto,
} from '@heidi/contracts';

@ApiTags('city')
@Controller()
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  @ApiOperation({
    summary: 'List all cities',
    description: 'Retrieve a list of all active cities. Optionally filter by country.',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'Filter cities by country name or code',
    example: 'Germany',
  })
  @ApiResponse({
    status: 200,
    description: 'Cities retrieved successfully',
    type: ListCitiesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for query parameters',
    type: ValidationErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async findAll(@Query('country') country?: string) {
    return this.cityService.findAll(country);
  }

  @Get('search/nearby')
  @ApiOperation({
    summary: 'Find nearby cities',
    description:
      'Find cities within a specified radius (in kilometers) from given coordinates using the Haversine formula.',
  })
  @ApiQuery({
    name: 'lat',
    required: true,
    description: 'Latitude coordinate (decimal degrees)',
    example: 54.3233,
    type: Number,
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    description: 'Longitude coordinate (decimal degrees)',
    example: 10.1394,
    type: Number,
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    description: 'Search radius in kilometers',
    example: 50,
    type: Number,
    default: 50,
  })
  @ApiResponse({
    status: 200,
    description: 'Nearby cities retrieved successfully',
    type: ListCitiesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for query parameters',
    type: ValidationErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 50,
  ) {
    return this.cityService.findNearby(+lat, +lng, +radius);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get city by ID',
    description: 'Retrieve a single city by its unique identifier.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the city',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'City retrieved successfully',
    type: GetCityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'City not found',
    type: CityNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    return this.cityService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new city',
    description:
      'Create a new city with the provided information. All required fields must be provided.',
  })
  @ApiBody({
    type: CreateCityDto,
    examples: {
      basicCity: {
        summary: 'Basic city creation',
        value: {
          name: 'Kiel',
          country: 'Germany',
          latitude: 54.3233,
          longitude: 10.1394,
        },
      },
      fullCity: {
        summary: 'City with all fields',
        value: {
          name: 'Kiel',
          country: 'Germany',
          state: 'Schleswig-Holstein',
          latitude: 54.3233,
          longitude: 10.1394,
          population: 247548,
          timezone: 'Europe/Berlin',
          metadata: {
            areaCode: '0431',
            postalCode: '24103',
          },
        },
        description: 'Example with all optional fields included',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'City created successfully',
    type: CreateCityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
    examples: {
      missingRequired: {
        summary: 'Missing required fields',
        value: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: ['name should not be empty', 'latitude must be a number'],
          },
        },
      },
      invalidCoordinates: {
        summary: 'Invalid coordinates',
        value: {
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/',
          method: 'POST',
          requestId: 'req_1234567890_abc123',
          statusCode: 400,
          details: {
            message: [
              'latitude must not be greater than 90',
              'longitude must not be greater than 180',
            ],
          },
        },
      },
    },
  })
  async create(@Body() dto: CreateCityDto) {
    return this.cityService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a city',
    description:
      'Update an existing city. Only provided fields will be updated. Setting isActive to false performs a soft delete.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the city',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateCityDto,
    examples: {
      updateName: {
        summary: 'Update city name',
        value: {
          name: 'Kiel Updated',
        },
      },
      updatePopulation: {
        summary: 'Update population',
        value: {
          population: 250000,
        },
      },
      softDelete: {
        summary: 'Soft delete city',
        value: {
          isActive: false,
        },
        description: 'Setting isActive to false performs a soft delete',
      },
      fullUpdate: {
        summary: 'Update multiple fields',
        value: {
          name: 'Kiel',
          population: 247548,
          timezone: 'Europe/Berlin',
          metadata: {
            areaCode: '0431',
            postalCode: '24103',
          },
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'City updated successfully',
    type: UpdateCityResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    type: ValidationErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'City not found',
    type: CityNotFoundErrorResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  async update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cityService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a city',
    description:
      'Delete a city by setting isActive to false (soft delete). The city record remains in the database but is marked as inactive.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier for the city',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'City deleted successfully',
    type: DeleteCityResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'City not found',
    type: CityNotFoundErrorResponseDto,
    examples: {
      notFound: {
        summary: 'City not found',
        value: {
          errorCode: 'CITY_NOT_FOUND',
          message: 'City not found',
          timestamp: '2024-01-01T00:00:00.000Z',
          path: '/123e4567-e89b-12d3-a456-426614174000',
          method: 'DELETE',
          requestId: 'req_1234567890_abc123',
          statusCode: 404,
          details: {
            cityId: '123e4567-e89b-12d3-a456-426614174000',
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    return this.cityService.delete(id);
  }
}

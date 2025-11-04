import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CityService } from './city.service';
import { CreateCityDto, UpdateCityDto } from './dto';

@Controller()
export class CityController {
  constructor(private readonly cityService: CityService) {}

  @Get()
  async findAll(@Query('country') country?: string) {
    return this.cityService.findAll(country);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.cityService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateCityDto) {
    return this.cityService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.cityService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.cityService.delete(id);
  }

  @Get('search/nearby')
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius: number = 50,
  ) {
    return this.cityService.findNearby(+lat, +lng, +radius);
  }
}

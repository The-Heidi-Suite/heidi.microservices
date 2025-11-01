import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaCityService } from '@heidi/prisma';
import { CreateCityDto, UpdateCityDto } from './dto';

@Injectable()
export class CityService {
  private readonly logger = new Logger(CityService.name);

  constructor(private readonly prisma: PrismaCityService) {}

  async findAll(country?: string) {
    return this.prisma.city.findMany({
      where: country ? { country, isActive: true } : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('City not found');
    return city;
  }

  async create(dto: CreateCityDto) {
    const city = await this.prisma.city.create({ data: dto });
    this.logger.log(`City created: ${city.id}`);
    return city;
  }

  async update(id: string, dto: UpdateCityDto) {
    await this.findOne(id);
    const city = await this.prisma.city.update({ where: { id }, data: dto });
    this.logger.log(`City updated: ${id}`);
    return city;
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.city.update({ where: { id }, data: { isActive: false } });
    this.logger.log(`City deleted: ${id}`);
    return { message: 'City deleted successfully' };
  }

  async findNearby(lat: number, lng: number, radiusKm: number) {
    // Simple distance calculation (Haversine formula can be implemented)
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
    });

    return cities.filter((city) => {
      const distance = this.calculateDistance(lat, lng, city.latitude, city.longitude);
      return distance <= radiusKm;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

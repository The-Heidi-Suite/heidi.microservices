import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaIntegrationService } from '@heidi/prisma';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { firstValueFrom } from 'rxjs';

interface MobilithekParkingConfig {
  apiUrl: string;
  apiKey?: string;
  cityId: string;
  updateInterval?: number; // in minutes
  enabled?: boolean;
}

// Based on Smart Data Models OffStreetParking schema
interface OffStreetParkingData {
  id: string;
  type?: 'OffStreetParking';
  location?: {
    type?: 'Point';
    coordinates?: [number, number]; // [longitude, latitude]
  };
  parkingSiteId?: string;
  name?: string;
  description?: string;
  category?: string[];
  allowedVehicleType?: string[];
  chargeType?: string[];
  requiredPermit?: string[];
  occupancyDetectionType?: string[];
  occupiedSpotNumber?: number;
  occupancyModified?: string;
  occupancy?: number;
  acceptedPaymentMethod?: string[];
  priceRatePerMinute?: number;
  priceCurrency?: string;
  fourWheelerSlots?: {
    availableSlotNumber?: number;
    totalSlotNumber?: number;
    occupiedSlotNumber?: number;
  };
  twoWheelerSlots?: {
    availableSlotNumber?: number;
    totalSlotNumber?: number;
    occupiedSlotNumber?: number;
  };
  unclassifiedSlots?: {
    availableSpotNumber?: number;
    totalSpotNumber?: number;
    occupiedSpotNumber?: number;
  };
  outOfServiceSlotNumber?: number;
  observationDateTime?: string;
  municipalityInfo?: {
    cityId?: string;
    cityName?: string;
    district?: string;
    [key: string]: any;
  };
  [key: string]: any; // For additional fields
}

@Injectable()
export class MobilithekParkingService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaIntegrationService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly http: HttpService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(MobilithekParkingService.name);
  }

  async fetchParkingData(config: MobilithekParkingConfig): Promise<OffStreetParkingData[]> {
    const url = config.apiUrl || 'https://apis.kielregion.addix.io/mtparken/';

    this.logger.log(`Fetching parking data from Mobilithek API: ${url}`);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await firstValueFrom(
        this.http.get<OffStreetParkingData[] | { features?: any[] } | any>(url, {
          headers,
          timeout: 30000,
        }),
      );

      // Handle different response formats
      let parkingData: OffStreetParkingData[] = [];

      if (Array.isArray(response.data)) {
        // Direct array of parking spaces
        parkingData = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // GeoJSON FeatureCollection format
        if ('features' in response.data && Array.isArray(response.data.features)) {
          parkingData = response.data.features.map((feature: any) => ({
            ...feature.properties,
            id: feature.id || feature.properties?.id || feature.properties?.parkingSiteId,
            location: feature.geometry,
          }));
        } else if ('type' in response.data && response.data.type === 'FeatureCollection') {
          // Standard GeoJSON FeatureCollection
          const features = response.data.features || [];
          parkingData = features.map((feature: any) => ({
            ...feature.properties,
            id: feature.id || feature.properties?.id || feature.properties?.parkingSiteId,
            location: feature.geometry,
          }));
        } else {
          // Single object, wrap in array
          parkingData = [response.data];
        }
      }

      this.logger.log(`Fetched ${parkingData.length} parking spaces from Mobilithek API`);
      return parkingData;
    } catch (error: any) {
      this.logger.error(`Failed to fetch from Mobilithek API: ${url}`, error?.message);
      throw error;
    }
  }

  async syncIntegration(integrationId: string): Promise<{ synced: number; errors: number }> {
    const integration = await this.prisma.integration.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (integration.provider !== 'MOBILITHEK_PARKING') {
      throw new Error(`Integration ${integrationId} is not a MOBILITHEK_PARKING integration`);
    }

    if (!integration.isActive) {
      this.logger.log(`Integration ${integrationId} is not active`);
      return { synced: 0, errors: 0 };
    }

    const config = integration.config as unknown as MobilithekParkingConfig;
    if (!config) {
      throw new Error(`Integration ${integrationId} has no configuration`);
    }

    if (config.enabled === false) {
      this.logger.log(`Integration ${integrationId} is disabled`);
      return { synced: 0, errors: 0 };
    }

    if (!config.apiUrl || !config.cityId) {
      throw new Error(
        `Integration ${integrationId} has invalid configuration: missing required fields`,
      );
    }

    this.logger.log(`Starting sync for Mobilithek parking integration ${integrationId}`);

    let synced = 0;
    let errors = 0;

    try {
      const parkingData = await this.fetchParkingData(config);

      // Emit event to core service to cache parking data
      for (const space of parkingData) {
        try {
          await firstValueFrom(
            this.client.send(RabbitMQPatterns.PARKING_SPACE_SYNC, {
              integrationId,
              cityId: config.cityId,
              parkingData: space,
              timestamp: new Date().toISOString(),
            }),
          );

          synced++;
        } catch (error: any) {
          this.logger.error(`Failed to sync parking space ${space.id}: ${error?.message}`, error);
          errors++;
        }
      }

      await this.prisma.integration.update({
        where: { id: integrationId },
        data: { lastSyncAt: new Date() },
      });

      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          event: 'sync_completed',
          payload: { spacesProcessed: parkingData.length },
          response: { synced, errors },
          status: 'SUCCESS',
        },
      });

      this.logger.log(`Sync completed: ${synced} spaces synced, ${errors} errors`);

      return { synced, errors };
    } catch (error: any) {
      this.logger.error(`Sync failed for integration ${integrationId}`, error);

      await this.prisma.integrationLog.create({
        data: {
          integrationId,
          event: 'sync_failed',
          payload: { error: error?.message },
          status: 'FAILED',
          errorMessage: error?.message || 'Unknown error',
        },
      });

      throw error;
    }
  }
}

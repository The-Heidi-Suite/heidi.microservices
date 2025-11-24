import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CoreService } from './core.service';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';

@Controller()
export class CoreMessageController {
  private readonly logger: LoggerService;

  constructor(
    private readonly coreService: CoreService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(CoreMessageController.name);
  }

  @MessagePattern(RabbitMQPatterns.CORE_GET_USER_ASSIGNMENTS)
  async getUserAssignments(@Payload() data: { userId: string; role?: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_GET_USER_ASSIGNMENTS} for userId: ${data.userId}`,
    );

    try {
      const result = await this.coreService.getUserAssignments(data.userId, data.role);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.CORE_GET_USER_ASSIGNMENTS} for userId: ${data.userId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.CORE_GET_USER_ASSIGNMENTS} for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.CORE_GET_USER_CITIES)
  async getUserCities(@Payload() data: { userId: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_GET_USER_CITIES} for userId: ${data.userId}`,
    );

    try {
      const result = await this.coreService.getUserCities(data.userId);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.CORE_GET_USER_CITIES} for userId: ${data.userId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.CORE_GET_USER_CITIES} for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.CORE_CREATE_USER_CITY_ASSIGNMENT)
  async createUserCityAssignment(
    @Payload() data: { userId: string; cityId: string; role: string },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_CREATE_USER_CITY_ASSIGNMENT} for userId: ${data.userId}, cityId: ${data.cityId}`,
    );

    try {
      const result = await this.coreService.createUserCityAssignment(
        data.userId,
        data.cityId,
        data.role,
      );
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.CORE_CREATE_USER_CITY_ASSIGNMENT} for userId: ${data.userId}, cityId: ${data.cityId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.CORE_CREATE_USER_CITY_ASSIGNMENT} for userId: ${data.userId}, cityId: ${data.cityId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN)
  async assignCityAdmin(
    @Payload()
    data: {
      userId: string;
      cityId: string;
      role: string | number;
      assignedBy: string;
      canGrantManageAdmins: boolean;
      canManageAdmins?: boolean;
    },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN} for userId: ${data.userId}, cityId: ${data.cityId}, role: ${data.role}, assignedBy: ${data.assignedBy}`,
    );

    try {
      const result = await this.coreService.assignCityAdmin(
        data.userId,
        data.cityId,
        data.role,
        data.assignedBy,
        data.canManageAdmins,
      );
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN} for userId: ${data.userId}, cityId: ${data.cityId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN} for userId: ${data.userId}, cityId: ${data.cityId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.INTEGRATION_SYNC_LISTING)
  async syncListingFromIntegration(
    @Payload() data: { integrationId: string; listingData: any; timestamp: string },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.INTEGRATION_SYNC_LISTING} for integrationId: ${data.integrationId}, externalId: ${data.listingData?.externalId}`,
    );

    try {
      const result = await this.coreService.syncListingFromIntegration(data.listingData);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.INTEGRATION_SYNC_LISTING} for externalId: ${data.listingData?.externalId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.INTEGRATION_SYNC_LISTING} for externalId: ${data.listingData?.externalId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.PARKING_SPACE_SYNC)
  async handleParkingSpaceSync(
    @Payload() data: { integrationId: string; cityId: string; parkingData: any; timestamp: string },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.PARKING_SPACE_SYNC} for integrationId: ${data.integrationId}, cityId: ${data.cityId}, parkingSiteId: ${data.parkingData?.parkingSiteId || data.parkingData?.id}`,
    );

    try {
      await this.coreService.syncParkingSpace({
        integrationId: data.integrationId,
        cityId: data.cityId,
        parkingData: data.parkingData,
      });
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.PARKING_SPACE_SYNC} for parkingSiteId: ${data.parkingData?.parkingSiteId || data.parkingData?.id} (will ACK)`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.PARKING_SPACE_SYNC} for parkingSiteId: ${data.parkingData?.parkingSiteId || data.parkingData?.id} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN)
  async handleFavoriteRemindersRun(@Payload() data: { taskId?: string; triggeredAt?: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN} for taskId: ${data.taskId || 'N/A'}`,
    );

    try {
      const result = await this.coreService.processFavoriteEventReminders(data.triggeredAt);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN} - sent ${result.sent24h} 24h reminders, ${result.sent2h} 2h reminders (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.LISTING_FAVORITE_REMINDERS_RUN} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }
}

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
      return await this.coreService.getUserAssignments(data.userId, data.role);
    } catch (error) {
      this.logger.error(`Error getting user assignments for userId: ${data.userId}`, error);
      throw error;
    }
  }

  @MessagePattern(RabbitMQPatterns.CORE_GET_USER_CITIES)
  async getUserCities(@Payload() data: { userId: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_GET_USER_CITIES} for userId: ${data.userId}`,
    );

    try {
      return await this.coreService.getUserCities(data.userId);
    } catch (error) {
      this.logger.error(`Error getting user cities for userId: ${data.userId}`, error);
      throw error;
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
      return await this.coreService.createUserCityAssignment(data.userId, data.cityId, data.role);
    } catch (error) {
      this.logger.error(
        `Error creating user city assignment for userId: ${data.userId}, cityId: ${data.cityId}`,
        error,
      );
      throw error;
    }
  }

  @MessagePattern(RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN)
  async assignCityAdmin(@Payload() data: { userId: string; cityId: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.CORE_ASSIGN_CITY_ADMIN} for userId: ${data.userId}, cityId: ${data.cityId}`,
    );

    try {
      return await this.coreService.assignCityAdmin(data.userId, data.cityId);
    } catch (error) {
      this.logger.error(
        `Error assigning city admin for userId: ${data.userId}, cityId: ${data.cityId}`,
        error,
      );
      throw error;
    }
  }
}

import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';
import { RabbitMQPatterns } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';

@Controller()
export class UsersMessageController {
  private readonly logger: LoggerService;

  constructor(
    private readonly usersService: UsersService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(UsersMessageController.name);
  }

  @MessagePattern(RabbitMQPatterns.USER_FIND_BY_EMAIL)
  async findByEmail(@Payload() data: { email: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_FIND_BY_EMAIL} for email: ${data.email}`,
    );

    try {
      // Note: Returns password for authentication purposes (internal RabbitMQ communication)
      const user = await this.usersService.findByEmail(data.email);
      return user; // Return user with password for auth service
    } catch (error) {
      this.logger.error(`Error finding user by email: ${data.email}`, error);
      throw error;
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_FIND_BY_ID)
  async findById(@Payload() data: { id: string }) {
    this.logger.log(`Received message: ${RabbitMQPatterns.USER_FIND_BY_ID} for id: ${data.id}`);

    try {
      const user = await this.usersService.findOne(data.id);
      // Return user without password
      const { password, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(`Error finding user by id: ${data.id}`, error);
      throw error;
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_GET_PROFILE)
  async getProfile(@Payload() data: { userId: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_GET_PROFILE} for userId: ${data.userId}`,
    );

    try {
      return await this.usersService.getProfile(data.userId);
    } catch (error) {
      this.logger.error(`Error getting profile for userId: ${data.userId}`, error);
      throw error;
    }
  }
}

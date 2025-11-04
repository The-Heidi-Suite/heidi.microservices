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
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_FIND_BY_EMAIL} for email: ${data.email} (will ACK)`,
      );
      return user; // Return user with password for auth service
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_FIND_BY_EMAIL} for email: ${data.email} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_FIND_BY_USERNAME)
  async findByUsername(@Payload() data: { username: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_FIND_BY_USERNAME} for username: ${data.username}`,
    );

    try {
      // Note: Returns password for authentication purposes (internal RabbitMQ communication)
      const user = await this.usersService.findByUsername(data.username);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_FIND_BY_USERNAME} for username: ${data.username} (will ACK)`,
      );
      return user; // Return user with password for auth service
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_FIND_BY_USERNAME} for username: ${data.username} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_FIND_BY_ID)
  async findById(@Payload() data: { id: string }) {
    this.logger.log(`Received message: ${RabbitMQPatterns.USER_FIND_BY_ID} for id: ${data.id}`);

    try {
      const user = await this.usersService.findOne(data.id);
      // Return user without password
      const { password, ...userWithoutPassword } = user as any;
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_FIND_BY_ID} for id: ${data.id} (will ACK)`,
      );
      return userWithoutPassword;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_FIND_BY_ID} for id: ${data.id} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_GET_PROFILE)
  async getProfile(@Payload() data: { userId: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_GET_PROFILE} for userId: ${data.userId}`,
    );

    try {
      const result = await this.usersService.getProfile(data.userId);
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_GET_PROFILE} for userId: ${data.userId} (will ACK)`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_GET_PROFILE} for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }
}

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
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_FIND_BY_ID} for id: ${data.id} (will ACK)`,
      );
      return user;
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

  @MessagePattern(RabbitMQPatterns.USER_CREATE_GUEST)
  async createGuest(
    @Payload() data: { deviceId: string; devicePlatform: string; deviceMetadata?: any },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_CREATE_GUEST} for device: ${data.deviceId} (${data.devicePlatform})`,
    );

    try {
      const guestUser = await this.usersService.createGuest(
        data.deviceId,
        data.devicePlatform as any,
        data.deviceMetadata,
      );
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_CREATE_GUEST} for device: ${data.deviceId} (will ACK)`,
      );
      return guestUser;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_CREATE_GUEST} for device: ${data.deviceId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_FIND_BY_DEVICE)
  async findByDevice(@Payload() data: { deviceId: string; devicePlatform: string }) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_FIND_BY_DEVICE} for device: ${data.deviceId} (${data.devicePlatform})`,
    );

    try {
      const guestUser = await this.usersService.findByDeviceId(
        data.deviceId,
        data.devicePlatform as any,
      );
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_FIND_BY_DEVICE} for device: ${data.deviceId} (will ACK)`,
      );
      return guestUser;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_FIND_BY_DEVICE} for device: ${data.deviceId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.USER_CONVERT_GUEST)
  async convertGuest(
    @Payload()
    data: {
      guestUserId: string;
      email: string;
      username: string;
      password: string;
      firstName?: string;
      lastName?: string;
      cityId?: string;
    },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.USER_CONVERT_GUEST} for guestUserId: ${data.guestUserId}`,
    );

    try {
      const registeredUser = await this.usersService.convertGuestToUser(data.guestUserId, {
        email: data.email,
        username: data.username,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        cityId: data.cityId,
      });
      this.logger.debug(
        `Successfully processed message: ${RabbitMQPatterns.USER_CONVERT_GUEST} for guestUserId: ${data.guestUserId} (will ACK)`,
      );
      return registeredUser;
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.USER_CONVERT_GUEST} for guestUserId: ${data.guestUserId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }

  @MessagePattern(RabbitMQPatterns.VERIFICATION_VERIFIED)
  async handleVerificationVerified(
    @Payload()
    data: {
      userId: string;
      type: string;
      identifier: string;
      verifiedAt: string;
      timestamp: string;
    },
  ) {
    this.logger.log(
      `Received message: ${RabbitMQPatterns.VERIFICATION_VERIFIED} for userId: ${data.userId}`,
    );

    try {
      // Only handle EMAIL verification
      if (data.type === 'EMAIL') {
        const result = await this.usersService.markEmailAsVerified(data.userId);
        this.logger.debug(
          `Successfully processed message: ${RabbitMQPatterns.VERIFICATION_VERIFIED} for userId: ${data.userId} (will ACK)`,
        );
        return result;
      }

      // For SMS or other types, just acknowledge
      return { success: true, message: 'Verification acknowledged' };
    } catch (error) {
      this.logger.error(
        `Error processing message: ${RabbitMQPatterns.VERIFICATION_VERIFIED} for userId: ${data.userId} (will NACK)`,
        error,
      );
      throw error; // Throwing error causes NestJS to NACK the message
    }
  }
}

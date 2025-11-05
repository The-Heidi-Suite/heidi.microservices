import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaUsersService } from '@heidi/prisma';
import { PermissionService } from '@heidi/rbac';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { UserRole } from '@prisma/client-core';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  RegisterDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '@heidi/contracts';
import { SagaOrchestratorService } from '@heidi/saga';

@Injectable()
export class UsersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaUsersService,
    private readonly permissionService: PermissionService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(UsersService.name);
  }

  /**
   * Register a new user (public endpoint)
   * Uses Saga pattern if cityId is provided (multi-service transaction)
   */
  async register(dto: RegisterDto) {
    this.logger.log(`Registering user: ${dto.email}`);

    // Check if user already exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if username already exists
    const existingUserByUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('User with this username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // If cityId is provided, use Saga pattern for distributed transaction
    if (dto.cityId) {
      return this.registerWithCity(dto, hashedPassword);
    }

    // Simple case: just create user (no city assignment)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.CITIZEN,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Emit user created event
    this.client.emit(RabbitMQPatterns.USER_CREATED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User registered successfully: ${user.id}`);
    return user;
  }

  /**
   * Register user with city assignment using Saga pattern
   */
  private async registerWithCity(dto: RegisterDto, hashedPassword: string) {
    const sagaId = await this.sagaOrchestrator.createSaga('USER_REGISTRATION', [
      {
        stepId: 'CREATE_USER',
        service: 'users',
        action: 'CREATE_LOCAL',
        payload: {
          email: dto.email,
          username: dto.username,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.CITIZEN,
        },
        compensation: {
          action: 'DELETE_USER',
          payload: { userId: '{{result.id}}' },
        },
      },
      {
        stepId: 'ASSIGN_CITY',
        service: 'core',
        action: 'CREATE_USER_CITY_ASSIGNMENT',
        payload: {
          userId: '{{steps.CREATE_USER.result.id}}',
          cityId: dto.cityId,
          role: UserRole.CITIZEN,
        },
        compensation: {
          action: 'REMOVE_USER_CITY_ASSIGNMENT',
          payload: {
            userId: '{{steps.CREATE_USER.result.id}}',
            cityId: dto.cityId,
          },
        },
      },
    ]);

    try {
      // Step 1: Create user (local operation)
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          password: hashedPassword,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.CITIZEN,
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      const step1Result = await this.sagaOrchestrator.executeStep(sagaId, user);
      if (step1Result.completed) {
        throw new Error('Unexpected saga completion after step 1');
      }

      // Step 2: Assign city via core service
      if (!dto.cityId) {
        throw new Error('City ID is required for city assignment');
      }

      try {
        await firstValueFrom(
          this.client
            .send<
              { id: string; userId: string; cityId: string },
              { userId: string; cityId: string; role: UserRole }
            >(RabbitMQPatterns.CORE_CREATE_USER_CITY_ASSIGNMENT, {
              userId: user.id,
              cityId: dto.cityId,
              role: UserRole.CITIZEN,
            })
            .pipe(timeout(10000)),
        );

        await this.sagaOrchestrator.executeStep(sagaId, { success: true });
      } catch (error) {
        // Step 2 failed - compensate
        this.logger.error(`City assignment failed for user ${user.id}, compensating...`, error);
        await this.sagaOrchestrator.failStep(sagaId, error.message);

        // Compensate: Delete user
        const compensationSteps = await this.sagaOrchestrator.compensate(sagaId);
        for (const compStep of compensationSteps) {
          if (compStep.stepId === 'CREATE_USER') {
            // Delete the created user
            await this.prisma.user.delete({ where: { id: user.id } });
          }
        }

        await this.sagaOrchestrator.markCompensated(sagaId);
        throw new ConflictException('Failed to assign city. User registration rolled back.');
      }

      // Emit user created event
      this.client.emit(RabbitMQPatterns.USER_CREATED, {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User registered successfully with city assignment: ${user.id}`);
      return user;
    } catch (error) {
      // If it's already been handled by compensation, rethrow
      if (error instanceof ConflictException) {
        throw error;
      }

      // Unexpected error - try to compensate
      this.logger.error(`User registration failed: ${error.message}`, error);
      await this.sagaOrchestrator.failStep(sagaId, error.message);
      throw error;
    }
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          firstName: true,
          lastName: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return { users, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Find user by email (for internal/RabbitMQ use)
   * Returns user with password for authentication purposes
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Find user by username (for internal/RabbitMQ use)
   * Returns user with password for authentication purposes
   */
  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    this.client.emit(RabbitMQPatterns.USER_CREATED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User created: ${user.id}`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id); // Check existence

    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User updated: ${id}`);
    return user;
  }

  async delete(id: string) {
    await this.findOne(id); // Check existence

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    this.client.emit(RabbitMQPatterns.USER_DELETED, {
      userId: id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User deleted: ${id}`);
    return { message: 'User deleted successfully' };
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    this.logger.log(`Getting profile for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get city assignments from core service via RabbitMQ
    const cityAssignments = await firstValueFrom(
      this.client
        .send<
          Array<{ cityId: string; role: UserRole; canManageAdmins: boolean; createdAt: Date }>,
          { userId: string }
        >(RabbitMQPatterns.CORE_GET_USER_ASSIGNMENTS, { userId })
        .pipe(timeout(10000)),
    );

    return {
      ...user,
      cityAssignments,
    };
  }

  /**
   * Update current user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for user: ${userId}`);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Profile updated for user: ${userId}`);
    return user;
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    this.logger.log(`Changing password for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully' };
  }
}

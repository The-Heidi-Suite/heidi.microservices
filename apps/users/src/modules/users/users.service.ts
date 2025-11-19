import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import { PrismaUsersService } from '@heidi/prisma';
import { PermissionService, roleToNumber } from '@heidi/rbac';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { LoggerService } from '@heidi/logger';
import { UserRole } from '@prisma/client-core';
import { UserType, DevicePlatform } from '@prisma/client-users';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  RegisterDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '@heidi/contracts';
import { SagaOrchestratorService } from '@heidi/saga';
import { ErrorCode } from '@heidi/errors';
import { I18nService } from '@heidi/i18n';

@Injectable()
export class UsersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaUsersService,
    private readonly permissionService: PermissionService,
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly sagaOrchestrator: SagaOrchestratorService,
    private readonly i18nService: I18nService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(UsersService.name);
  }

  /**
   * Register a new user (public endpoint)
   * Uses Saga pattern if cityId is provided (multi-service transaction)
   */
  async register(dto: RegisterDto, language?: string) {
    // Validate required fields for registration (only email and password are required)
    if (!dto.email || !dto.password) {
      throw new ConflictException({ errorCode: ErrorCode.REGISTRATION_FIELDS_REQUIRED });
    }

    this.logger.log(`Registering user: ${dto.email}`);

    // Check if user already exists by email
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException({ errorCode: ErrorCode.DUPLICATE_EMAIL });
    }

    // Check if username already exists (only if username is provided)
    if (dto.username) {
      const existingUserByUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUserByUsername) {
        throw new ConflictException({ errorCode: ErrorCode.DUPLICATE_USERNAME });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // If cityId is provided, use Saga pattern for distributed transaction
    if (dto.cityId) {
      return this.registerWithCity(dto, hashedPassword, language);
    }

    // Simple case: just create user (no city assignment)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username || null,
        password: hashedPassword,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        role: UserRole.CITIZEN,
        emailVerified: false,
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
      firstName: user.firstName,
      lastName: user.lastName,
      cityId: null, // No city selected
      timestamp: new Date().toISOString(),
      preferredLanguage: language,
    });

    this.logger.log(`User registered successfully: ${user.id}`);
    return user;
  }

  /**
   * Register user with city assignment using Saga pattern
   */
  private async registerWithCity(dto: RegisterDto, hashedPassword: string, language?: string) {
    const sagaId = await this.sagaOrchestrator.createSaga('USER_REGISTRATION', [
      {
        stepId: 'CREATE_USER',
        service: 'users',
        action: 'CREATE_LOCAL',
        payload: {
          email: dto.email,
          username: dto.username || null,
          password: hashedPassword,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
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
          username: dto.username || null,
          password: hashedPassword,
          firstName: dto.firstName || null,
          lastName: dto.lastName || null,
          role: UserRole.CITIZEN,
          emailVerified: false,
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
        firstName: user.firstName,
        lastName: user.lastName,
        cityId: dto.cityId || null, // Include cityId if provided
        timestamp: new Date().toISOString(),
        preferredLanguage: language,
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
        where: {
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
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
      this.prisma.user.count({
        where: {
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
      }),
    ]);

    // Convert role to number for each user (like login API does)
    const usersWithNumberRole = users.map((user) => ({
      ...user,
      role: roleToNumber(user.role),
    }));

    return {
      users: usersWithNumberRole,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Find users by city ID
   */
  async findByCity(cityId: string, page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          cityId,
          isActive: true,
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          firstName: true,
          lastName: true,
          cityId: true,
          preferredLanguage: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({
        where: {
          cityId,
          isActive: true,
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Find all active users (paginated)
   */
  async findAllActive(page = 1, limit = 100) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          firstName: true,
          lastName: true,
          cityId: true,
          preferredLanguage: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          deletedAt: null,
          userType: UserType.REGISTERED,
        },
      }),
    ]);

    return {
      users,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        userType: true,
        deviceId: true,
        devicePlatform: true,
        firstName: true,
        lastName: true,
        cityId: true,
        preferredLanguage: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    // Convert role to number (like login API does)
    return {
      ...user,
      role: roleToNumber(user.role),
    };
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
        emailVerified: true,
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
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(dto: CreateUserDto, language?: string) {
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
      preferredLanguage: language,
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
        profilePhotoUrl: true,
        preferredLanguage: true,
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
      role: roleToNumber(user.role),
      cityAssignments: cityAssignments.map((assignment) => ({
        ...assignment,
        role: roleToNumber(assignment.role),
      })),
    };
  }

  /**
   * Update current user profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    this.logger.log(`Updating profile for user: ${userId}`);

    // Validate preferredLanguage if provided
    if (dto.preferredLanguage) {
      const supportedLanguages = this.i18nService.getSupportedLanguages();
      if (!supportedLanguages.includes(dto.preferredLanguage)) {
        throw new BadRequestException(
          `Unsupported language: ${dto.preferredLanguage}. Supported languages: ${supportedLanguages.join(', ')}`,
        );
      }
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = dto.profilePhotoUrl;
    if (dto.preferredLanguage !== undefined) updateData.preferredLanguage = dto.preferredLanguage;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        firstName: true,
        lastName: true,
        profilePhotoUrl: true,
        preferredLanguage: true,
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
   * Update user's preferred language
   */
  async updatePreferredLanguage(userId: string, language: string) {
    this.logger.log(`Updating preferred language for user: ${userId} to ${language}`);

    // Validate language
    const supportedLanguages = this.i18nService.getSupportedLanguages();
    if (!supportedLanguages.includes(language)) {
      throw new BadRequestException(
        `Unsupported language: ${language}. Supported languages: ${supportedLanguages.join(', ')}`,
      );
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { preferredLanguage: language },
      select: {
        id: true,
        preferredLanguage: true,
        updatedAt: true,
      },
    });

    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Preferred language updated for user: ${userId}`);
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

    // Guest users don't have passwords
    if (!user.password) {
      throw new UnauthorizedException('Guest users cannot change password. Please register first.');
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

  /**
   * Create a new guest user
   * Checks for existing guest with same deviceId and devicePlatform to prevent duplicates
   */
  async createGuest(
    deviceId: string,
    devicePlatform: DevicePlatform,
    _deviceMetadata?: Record<string, any>,
  ) {
    this.logger.log(`Creating guest user for device: ${deviceId} (${devicePlatform})`);

    // Check if guest already exists for this device
    const existingGuest = await this.prisma.user.findFirst({
      where: {
        deviceId,
        devicePlatform,
        userType: UserType.GUEST,
        deletedAt: null,
      },
    });

    if (existingGuest) {
      this.logger.log(
        `Guest user already exists for device: ${deviceId}, returning existing guest`,
      );
      return {
        id: existingGuest.id,
        guestId: existingGuest.guestId,
        deviceId: existingGuest.deviceId,
        devicePlatform: existingGuest.devicePlatform,
        userType: existingGuest.userType,
        createdAt: existingGuest.createdAt,
        requiresTermsAcceptance: false, // Guests don't need to accept terms
      };
    }

    // Generate unique guest ID
    const guestId = `guest_${deviceId}_${Date.now()}`;

    // Create new guest user
    const guestUser = await this.prisma.user.create({
      data: {
        guestId,
        deviceId,
        devicePlatform,
        userType: UserType.GUEST,
        role: UserRole.CITIZEN,
        email: null,
        username: null,
        password: null,
        isActive: true,
      },
      select: {
        id: true,
        guestId: true,
        deviceId: true,
        devicePlatform: true,
        userType: true,
        createdAt: true,
      },
    });

    // Emit user created event
    this.client.emit(RabbitMQPatterns.USER_CREATED, {
      userId: guestUser.id,
      userType: 'GUEST',
      deviceId,
      devicePlatform,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Guest user created successfully: ${guestUser.id}`);

    // Return guest user with requiresTermsAcceptance flag
    return {
      ...guestUser,
      requiresTermsAcceptance: false, // Guests don't need to accept terms
    };
  }

  /**
   * Find guest user by device ID and platform
   * Used for session restoration when app reopens
   */
  async findByDeviceId(deviceId: string, devicePlatform: DevicePlatform) {
    this.logger.log(`Finding guest user by device: ${deviceId} (${devicePlatform})`);

    const guestUser = await this.prisma.user.findFirst({
      where: {
        deviceId,
        devicePlatform,
        userType: UserType.GUEST,
        deletedAt: null,
      },
      select: {
        id: true,
        guestId: true,
        deviceId: true,
        devicePlatform: true,
        userType: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return guestUser;
  }

  /**
   * Convert guest user to registered user
   * All data linked by userId automatically transfers (favorites, listings, etc.)
   */
  async convertGuestToUser(guestUserId: string, dto: RegisterDto) {
    this.logger.log(`Converting guest user to registered: ${guestUserId}`);

    // Validate required fields (only email and password are required)
    if (!dto.email || !dto.password) {
      throw new ConflictException({ errorCode: ErrorCode.REGISTRATION_FIELDS_REQUIRED });
    }

    // Get guest user
    const guestUser = await this.prisma.user.findUnique({
      where: { id: guestUserId },
    });

    if (!guestUser) {
      throw new NotFoundException('Guest user not found');
    }

    if (guestUser.userType !== UserType.GUEST) {
      throw new ConflictException('User is not a guest user');
    }

    // Check if email already exists
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException({ errorCode: ErrorCode.DUPLICATE_EMAIL });
    }

    // Check if username already exists (only if username is provided)
    if (dto.username) {
      const existingUserByUsername = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (existingUserByUsername) {
        throw new ConflictException({ errorCode: ErrorCode.DUPLICATE_USERNAME });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Update user record (same userId, so data auto-migrates)
    const registeredUser = await this.prisma.user.update({
      where: { id: guestUserId },
      data: {
        email: dto.email,
        username: dto.username || null,
        password: hashedPassword,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        userType: UserType.REGISTERED,
        emailVerified: false,
        migratedFromGuestId: guestUser.guestId, // Store original guest ID for historical tracking
        guestId: null, // Clear guestId since user is no longer a guest
        // Keep deviceId and devicePlatform for reference, but can be cleared if needed
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        userType: true,
        firstName: true,
        lastName: true,
        migratedFromGuestId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Emit user created event (since this is effectively a new registration)
    this.client.emit(RabbitMQPatterns.USER_CREATED, {
      userId: registeredUser.id,
      email: registeredUser.email,
      firstName: registeredUser.firstName,
      lastName: registeredUser.lastName,
      timestamp: new Date().toISOString(),
    });

    // Also emit user updated event for tracking
    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: registeredUser.id,
      action: 'GUEST_TO_USER_CONVERSION',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Guest user converted to registered user successfully: ${registeredUser.id}`);
    return registeredUser;
  }

  /**
   * Mark user's email as verified
   */
  async markEmailAsVerified(userId: string) {
    this.logger.log(`Marking email as verified for user: ${userId}`);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        updatedAt: true,
      },
    });

    // Emit user updated event
    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Email verified for user: ${userId}`);
    return user;
  }

  /**
   * Request password reset - sends email with reset link
   */
  async requestPasswordReset(email: string, language?: string) {
    this.logger.log(`Password reset requested for email: ${email}`);

    // Translate the message using i18nService
    const message =
      this.i18nService.translate('success.PASSWORD_RESET_IF_EXISTS', undefined, language) ||
      'If an account with that email exists, a password reset link has been sent.';

    // Find user by email
    const user = await this.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { message };
    }

    // Emit password reset requested event
    this.client.emit(RabbitMQPatterns.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
      metadata: {
        firstName: user.firstName,
        lastName: user.lastName,
        preferredLanguage: language,
      },
    });

    this.logger.log(`Password reset email queued for user: ${user.id}`);
    return { message };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string, _language?: string) {
    this.logger.log(`Password reset attempt with token`);

    // Verify token via notification service
    let tokenData;
    try {
      tokenData = await firstValueFrom(
        this.client
          .send<{
            valid: boolean;
            userId: string;
            email: string;
            resetTokenId: string;
          }>(RabbitMQPatterns.PASSWORD_RESET_VERIFY, { token })
          .pipe(timeout(10000)),
      );
    } catch (error) {
      this.logger.error('Failed to verify password reset token', error);
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (!tokenData || !tokenData.valid) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await this.prisma.user.update({
      where: { id: tokenData.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    this.client.emit(RabbitMQPatterns.PASSWORD_RESET_MARK_USED, {
      token,
    });

    // Emit password reset completed event
    this.client.emit(RabbitMQPatterns.PASSWORD_RESET_COMPLETED, {
      userId: tokenData.userId,
      email: tokenData.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Password reset completed for user: ${tokenData.userId}`);
    return {
      message: 'Password has been reset successfully',
    };
  }

  /**
   * Update user role
   * Used when assigning city admin or updating roles via core service
   */
  async updateUserRole(userId: string, role: string, updatedBy?: string) {
    this.logger.log(`Updating user role: userId=${userId}, role=${role}, updatedBy=${updatedBy}`);

    // Normalize role
    const normalizedRole = role.toUpperCase() as UserRole;

    // Verify user exists
    await this.findOne(userId);

    // Update user role
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { role: normalizedRole },
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

    // Emit user updated event
    this.client.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      action: 'ROLE_UPDATED',
      newRole: normalizedRole,
      updatedBy,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User role updated successfully: userId=${userId}, newRole=${normalizedRole}`);
    return {
      success: true,
      user,
    };
  }
}

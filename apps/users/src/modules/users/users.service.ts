import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaUsersService, PrismaCoreService } from '@heidi/prisma';
import { PermissionService } from '@heidi/rbac';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { UserRole } from '@prisma/client-core';
import * as bcrypt from 'bcrypt';
import {
  CreateUserDto,
  UpdateUserDto,
  RegisterDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '@heidi/contracts';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaUsersService,
    private readonly prismaCore: PrismaCoreService, // For UserCityAssignment
    private readonly permissionService: PermissionService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

  /**
   * Register a new user (public endpoint)
   */
  async register(dto: RegisterDto) {
    this.logger.log(`Registering user: ${dto.email}`);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user with CITIZEN role by default
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.CITIZEN,
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    // Create UserCityAssignment if cityId provided
    if (dto.cityId) {
      await this.prismaCore.userCityAssignment.create({
        data: {
          userId: user.id,
          cityId: dto.cityId,
          role: UserRole.CITIZEN,
        },
      });
    }

    // Emit user created event
    await this.rabbitmq.emit(RabbitMQPatterns.USER_CREATED, {
      userId: user.id,
      email: user.email,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User registered successfully: ${user.id}`);

    return user;
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

  async create(dto: CreateUserDto) {
    const user = await this.prisma.user.create({
      data: dto,
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    await this.rabbitmq.emit(RabbitMQPatterns.USER_CREATED, {
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
        role: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    await this.rabbitmq.emit(RabbitMQPatterns.USER_UPDATED, {
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

    await this.rabbitmq.emit(RabbitMQPatterns.USER_DELETED, {
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

    // Get city assignments
    const cityAssignments = await this.prismaCore.userCityAssignment.findMany({
      where: { userId, isActive: true },
      select: {
        cityId: true,
        role: true,
        canManageAdmins: true,
        createdAt: true,
      },
    });

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
        role: true,
        firstName: true,
        lastName: true,
        updatedAt: true,
      },
    });

    await this.rabbitmq.emit(RabbitMQPatterns.USER_UPDATED, {
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

    await this.rabbitmq.emit(RabbitMQPatterns.USER_UPDATED, {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Password changed for user: ${userId}`);
    return { message: 'Password changed successfully' };
  }
}

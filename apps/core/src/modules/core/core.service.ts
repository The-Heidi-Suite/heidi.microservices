import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { PrismaCoreService } from '@heidi/prisma';
import { UserRole } from '@prisma/client-core';

@Injectable()
export class CoreService implements OnModuleInit {
  private readonly logger: LoggerService;

  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly redis: RedisService,
    private readonly prisma: PrismaCoreService,
    logger: LoggerService,
  ) {
    this.logger = logger;
    this.logger.setContext(CoreService.name);
  }

  async onModuleInit() {
    // Listen to events from other services
    this.logger.log('Core service initialized - listening to events');
  }

  async getStatus() {
    const cachedStatus = await this.redis.get('core:status');
    if (cachedStatus) {
      return cachedStatus;
    }

    const status = {
      service: 'core',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };

    await this.redis.set('core:status', status, 30);
    return status;
  }

  async executeOperation(payload: any) {
    this.logger.log(`Executing operation: ${JSON.stringify(payload)}`);

    // Example: Orchestrate operations across services
    this.client.emit(RabbitMQPatterns.CORE_OPERATION, {
      ...payload,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Operation queued for execution',
      operationId: Date.now().toString(),
    };
  }

  /**
   * Get user city assignments (for RabbitMQ request-response)
   */
  async getUserAssignments(userId: string, role?: string) {
    this.logger.log(`Getting user assignments for userId: ${userId}, role: ${role || 'all'}`);

    const assignments = await this.prisma.userCityAssignment.findMany({
      where: {
        userId,
        isActive: true,
        ...(role && { role: role as UserRole }),
      },
      select: {
        id: true,
        cityId: true,
        role: true,
        canManageAdmins: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return assignments.map((a) => ({
      cityId: a.cityId,
      role: a.role,
      canManageAdmins: a.canManageAdmins,
      createdAt: a.createdAt,
    }));
  }

  /**
   * Get user cities (for RabbitMQ request-response)
   */
  async getUserCities(userId: string) {
    this.logger.log(`Getting cities for userId: ${userId}`);

    const assignments = await this.prisma.userCityAssignment.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        cityId: true,
        role: true,
      },
    });

    return assignments.map((a) => a.cityId);
  }

  /**
   * Create user city assignment (for RabbitMQ request-response)
   */
  async createUserCityAssignment(userId: string, cityId: string, role: string) {
    this.logger.log(
      `Creating user city assignment: userId=${userId}, cityId=${cityId}, role=${role}`,
    );

    try {
      const assignment = await this.prisma.userCityAssignment.create({
        data: {
          userId,
          cityId,
          role: role as UserRole,
          canManageAdmins: role === UserRole.CITY_ADMIN,
        },
        select: {
          id: true,
          userId: true,
          cityId: true,
          role: true,
          canManageAdmins: true,
          createdAt: true,
        },
      });

      return {
        success: true,
        assignment,
      };
    } catch (error: any) {
      // Handle unique constraint violation
      if (error.code === 'P2002') {
        throw new Error('User already assigned to this city');
      }
      throw error;
    }
  }

  /**
   * Assign city admin (for RabbitMQ request-response)
   */
  async assignCityAdmin(userId: string, cityId: string) {
    this.logger.log(`Assigning city admin: userId=${userId}, cityId=${cityId}`);

    const assignment = await this.prisma.userCityAssignment.upsert({
      where: {
        userId_cityId: {
          userId,
          cityId,
        },
      },
      update: {
        role: UserRole.CITY_ADMIN,
        canManageAdmins: true,
        isActive: true,
      },
      create: {
        userId,
        cityId,
        role: UserRole.CITY_ADMIN,
        canManageAdmins: true,
      },
      select: {
        id: true,
        userId: true,
        cityId: true,
        role: true,
        canManageAdmins: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      assignment,
    };
  }
}

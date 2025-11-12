import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RABBITMQ_CLIENT, RabbitMQPatterns, RmqClientWrapper } from '@heidi/rabbitmq';
import { RedisService } from '@heidi/redis';
import { LoggerService } from '@heidi/logger';
import { PrismaCoreService } from '@heidi/prisma';
import { UserRole } from '@prisma/client-core';
import { CoreOperationRequestDto, CoreOperationResponseDto } from '@heidi/contracts';

@Injectable()
export class CoreService implements OnModuleInit {
  constructor(
    @Inject(RABBITMQ_CLIENT) private readonly client: RmqClientWrapper,
    private readonly redis: RedisService,
    private readonly prisma: PrismaCoreService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CoreService.name);
  }

  async onModuleInit() {
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

  async executeOperation(dto: CoreOperationRequestDto): Promise<CoreOperationResponseDto> {
    this.logger.log(`Queueing operation: ${dto.operation}`);

    this.client.emit(RabbitMQPatterns.CORE_OPERATION, {
      operation: dto.operation,
      payload: dto.payload ?? {},
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Operation queued for execution',
      operationId: Date.now().toString(),
    };
  }

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

    return assignments.map((assignment) => ({
      cityId: assignment.cityId,
      role: assignment.role,
      canManageAdmins: assignment.canManageAdmins,
      createdAt: assignment.createdAt,
    }));
  }

  async getUserCities(userId: string) {
    this.logger.log(`Getting cities for userId: ${userId}`);

    const assignments = await this.prisma.userCityAssignment.findMany({
      where: {
        userId,
        isActive: true,
      },
      select: {
        cityId: true,
      },
    });

    return assignments.map((assignment) => assignment.cityId);
  }

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
      if (error.code === 'P2002') {
        throw new Error('User already assigned to this city');
      }
      throw error;
    }
  }

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

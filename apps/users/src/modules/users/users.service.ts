import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '@heidi/prisma';
import { RabbitMQService, RabbitMQPatterns } from '@heidi/rabbitmq';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rabbitmq: RabbitMQService,
  ) {}

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
}

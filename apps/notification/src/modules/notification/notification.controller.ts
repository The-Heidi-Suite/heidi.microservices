import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SendNotificationDto } from '@heidi/contracts';

@Controller()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('notify')
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }

  @Get(':userId')
  async getUserNotifications(@Param('userId') userId: string, @Query('status') status?: string) {
    return this.notificationService.getUserNotifications(userId, status);
  }
}

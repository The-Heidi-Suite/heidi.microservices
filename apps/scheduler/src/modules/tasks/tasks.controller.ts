import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto';

@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll() {
    return this.tasksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }
}

import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

type RequestWithUser = Request & { user: Pick<User, 'id'> };

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Req() request: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.orders.createForUser(request.user.id, dto);
  }

  @Get('mine')
  mine(@Req() request: RequestWithUser) {
    return this.orders.findMine(request.user.id);
  }

  @Get(':id')
  one(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.orders.findOneForUser(request.user.id, id);
  }
}

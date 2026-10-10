import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTailoringRequestDto } from './dto/create-tailoring-request.dto';
import { TailoringService } from './tailoring.service';

type RequestWithUser = Request & { user: Pick<User, 'id'> };

@Controller('tailoring')
@UseGuards(JwtAuthGuard)
export class TailoringController {
  constructor(private readonly tailoring: TailoringService) {}

  @Post()
  create(@Req() request: RequestWithUser, @Body() dto: CreateTailoringRequestDto) {
    return this.tailoring.createForUser(request.user.id, dto);
  }

  @Get('mine')
  findMine(@Req() request: RequestWithUser) {
    return this.tailoring.findMine(request.user.id);
  }

  @Post(':id/approve-quote')
  approveQuote(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.tailoring.approveQuote(request.user.id, id);
  }

  @Post(':id/cancel')
  cancel(@Req() request: RequestWithUser, @Param('id') id: string) {
    return this.tailoring.cancelByUser(request.user.id, id);
  }
}

import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateTailoringRequestDto } from './dto/update-tailoring-request.dto';
import { TailoringService } from './tailoring.service';

type RequestWithUser = Request & { user: Pick<User, 'id'> };

@Controller('admin/tailoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTailoringController {
  constructor(private readonly tailoring: TailoringService) {}

  @Get()
  findAll() {
    return this.tailoring.findAllForAdmin();
  }

  @Patch(':id')
  update(@Req() request: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateTailoringRequestDto) {
    return this.tailoring.updateForAdmin(id, dto, request.user.id);
  }
}

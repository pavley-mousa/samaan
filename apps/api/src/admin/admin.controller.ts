import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  @Get('summary')
  summary() {
    return {
      message: 'تم التحقق من صلاحية مدير المتجر.',
      modules: ['products', 'orders', 'inventory', 'tailoring', 'wholesale', 'reports'],
    };
  }
}

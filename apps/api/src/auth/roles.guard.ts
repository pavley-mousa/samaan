import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { REQUIRED_ROLES_KEY } from './roles.decorator';

type RequestWithUser = Request & { user?: { role: UserRole } };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (!request.user || !required.includes(request.user.role)) throw new ForbiddenException('ليس لديك صلاحية لتنفيذ هذا الإجراء.');
    return true;
  }
}

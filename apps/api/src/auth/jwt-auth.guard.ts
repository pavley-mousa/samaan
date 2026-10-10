import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

type AuthenticatedRequest = Request & { user?: Awaited<ReturnType<AuthService['findActiveUser']>> };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.['store_session'] as string | undefined;
    if (!token) throw new UnauthorizedException('سجّل الدخول للمتابعة.');
    const userId = await this.authService.verifySessionToken(token);
    // Always load the current role from the database so role changes take effect immediately.
    request.user = await this.authService.findActiveUser(userId);
    return true;
  }
}

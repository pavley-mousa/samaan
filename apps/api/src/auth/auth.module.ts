import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { MailService } from './mail.service';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET ?? 'local-development-secret-replace-before-deploy-32chars', signOptions: { expiresIn: '1d' } })],
  controllers: [AuthController],
  providers: [AuthService, MailService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

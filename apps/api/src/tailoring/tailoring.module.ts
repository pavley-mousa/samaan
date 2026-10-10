import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminTailoringController } from './admin-tailoring.controller';
import { TailoringController } from './tailoring.controller';
import { TailoringService } from './tailoring.service';

@Module({
  imports: [AuthModule],
  controllers: [TailoringController, AdminTailoringController],
  providers: [TailoringService],
})
export class TailoringModule {}

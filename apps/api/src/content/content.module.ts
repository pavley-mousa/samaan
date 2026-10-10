import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  AdminPickupSlotsController,
  AdminSitePagesController,
  AdminSiteSettingsController,
} from './admin-content.controller';
import {
  PublicPickupSlotsController,
  PublicSitePagesController,
  PublicSiteSettingsController,
} from './public-content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [AuthModule],
  controllers: [
    PublicSitePagesController,
    PublicSiteSettingsController,
    PublicPickupSlotsController,
    AdminSitePagesController,
    AdminSiteSettingsController,
    AdminPickupSlotsController,
  ],
  providers: [ContentService],
})
export class ContentModule {}

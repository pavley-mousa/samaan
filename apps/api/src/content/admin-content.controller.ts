import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ContentService } from './content.service';
import { CreateSitePageDto, UpdateSitePageDto } from './dto/site-page.dto';
import { CreateMeasurementVideoUploadDto, MeasurementVideoDto } from './dto/measurement-video.dto';
import { CreatePickupSlotDto, UpdatePickupSlotDto } from './dto/pickup-slot.dto';

@Controller('admin/site-pages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSitePagesController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list() {
    return this.content.listPagesForAdmin();
  }

  @Post()
  create(@Body() dto: CreateSitePageDto) {
    return this.content.createPage(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSitePageDto) {
    return this.content.updatePage(id, dto);
  }

  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.content.archivePage(id);
  }
}

@Controller('admin/site-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSiteSettingsController {
  constructor(private readonly content: ContentService) {}

  @Patch('measurement-video')
  setMeasurementVideo(@Body() dto: MeasurementVideoDto) {
    return this.content.setMeasurementVideo(dto);
  }

  @Post('measurement-video/upload-url')
  createMeasurementVideoUploadUrl(@Body() dto: CreateMeasurementVideoUploadDto) {
    return this.content.createMeasurementVideoUploadUrl(dto);
  }
}

@Controller('admin/pickup-slots')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminPickupSlotsController {
  constructor(private readonly content: ContentService) {}

  @Get()
  list() {
    return this.content.listPickupSlotsForAdmin();
  }

  @Post()
  create(@Body() dto: CreatePickupSlotDto) {
    return this.content.createPickupSlot(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePickupSlotDto) {
    return this.content.updatePickupSlot(id, dto);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.content.deactivatePickupSlot(id);
  }
}

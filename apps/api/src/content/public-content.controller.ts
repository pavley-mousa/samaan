import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('site-pages')
export class PublicSitePagesController {
  constructor(private readonly content: ContentService) {}

  @Get()
  footerPages() {
    return this.content.listFooterPages();
  }

  @Get(':slug')
  page(@Param('slug') slug: string) {
    return this.content.findPublishedPage(slug);
  }
}

@Controller('site-settings')
export class PublicSiteSettingsController {
  constructor(private readonly content: ContentService) {}

  @Get('measurement-video')
  measurementVideo() {
    return this.content.getMeasurementVideo();
  }
}

@Controller('pickup-slots')
export class PublicPickupSlotsController {
  constructor(private readonly content: ContentService) {}

  @Get()
  available() {
    return this.content.listAvailablePickupSlots();
  }
}

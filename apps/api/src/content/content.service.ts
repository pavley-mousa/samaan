import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.module';
import { CreateSitePageDto, UpdateSitePageDto } from './dto/site-page.dto';
import { CreatePickupSlotDto, UpdatePickupSlotDto } from './dto/pickup-slot.dto';
import { CreateMeasurementVideoUploadDto, MeasurementVideoDto } from './dto/measurement-video.dto';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  listFooterPages() {
    return this.prisma.sitePage.findMany({
      where: { isPublished: true, showInFooter: true },
      select: { id: true, slug: true, title: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async findPublishedPage(slug: string) {
    const page = await this.prisma.sitePage.findFirst({ where: { slug, isPublished: true } });
    if (!page) throw new NotFoundException('الصفحة غير موجودة أو غير منشورة.');
    return page;
  }

  listPagesForAdmin() {
    return this.prisma.sitePage.findMany({ orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] });
  }

  createPage(dto: CreateSitePageDto) {
    return this.prisma.sitePage.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim().toLowerCase(),
        content: dto.content,
        isPublished: dto.isPublished ?? false,
        showInFooter: dto.showInFooter ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePage(id: string, dto: UpdateSitePageDto) {
    const exists = await this.prisma.sitePage.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('الصفحة غير موجودة.');
    return this.prisma.sitePage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.showInFooter !== undefined ? { showInFooter: dto.showInFooter } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async archivePage(id: string) {
    const result = await this.prisma.sitePage.updateMany({
      where: { id },
      data: { isPublished: false, showInFooter: false, updatedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('الصفحة غير موجودة.');
    return { message: 'تم إخفاء الصفحة من الموقع والفوتر.' };
  }

  async getMeasurementVideo() {
    const setting = await this.prisma.siteSetting.findUnique({ where: { key: 'measurement_video_url' } });
    return { videoUrl: setting?.value ?? null };
  }

  async setMeasurementVideo(dto: MeasurementVideoDto) {
    const videoUrl = dto.videoUrl?.trim() || null;
    if (videoUrl) {
      try {
        const parsed = new URL(videoUrl);
        if (parsed.protocol !== 'https:') throw new Error('https only');
      } catch {
        throw new BadRequestException('رابط الفيديو يجب أن يكون رابط HTTPS صحيحًا.');
      }
    }
    await this.prisma.siteSetting.upsert({
      where: { key: 'measurement_video_url' },
      create: { key: 'measurement_video_url', value: videoUrl },
      update: { value: videoUrl, updatedAt: new Date() },
    });
    return { videoUrl };
  }

  async createMeasurementVideoUploadUrl(dto: CreateMeasurementVideoUploadDto) {
    const supabaseUrl = (process.env.SUPABASE_URL ?? 'https://nabyqfjoxbruxvrkvgcg.supabase.co').replace(/\/$/, '');
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      throw new ServiceUnavailableException('رفع الفيديو غير مفعّل بعد. أضف SUPABASE_SERVICE_ROLE_KEY كسرّ في إعدادات API على Vercel، أو استخدم حقل رابط الفيديو مؤقتًا.');
    }

    const extensionByType: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
    };
    const ext = extensionByType[dto.contentType];
    if (!ext || !dto.filename.trim()) throw new BadRequestException('نوع الفيديو غير مدعوم.');
    const objectPath = `measurement-guide/${randomUUID()}.${ext}`;
    const signEndpoint = `${supabaseUrl}/storage/v1/object/upload/sign/measurement-guides/${objectPath}`;
    const response = await fetch(signEndpoint, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (!response.ok) {
      // Never send provider responses or credentials to the browser.
      throw new ServiceUnavailableException('تعذر تجهيز رابط رفع الفيديو إلى التخزين. راجع إعدادات Supabase Storage.');
    }

    const payload = await response.json() as { url?: string; signedURL?: string; token?: string };
    const signedPath = payload.url ?? payload.signedURL;
    if (!signedPath) throw new ServiceUnavailableException('لم يرجع التخزين رابط رفع صالحًا.');
    const uploadUrl = /^https?:\/\//i.test(signedPath)
      ? signedPath
      : `${supabaseUrl}/storage/v1${signedPath.startsWith('/') ? signedPath : `/${signedPath}`}`;
    return {
      uploadUrl,
      objectPath,
      publicUrl: `${supabaseUrl}/storage/v1/object/public/measurement-guides/${objectPath}`,
      contentType: dto.contentType,
    };
  }

  async listAvailablePickupSlots() {
    const now = new Date();
    const slots = await this.prisma.pickupSlot.findMany({
      where: { isActive: true, startsAt: { gt: now }, endsAt: { gt: now } },
      orderBy: { startsAt: 'asc' },
      take: 100,
    });
    return slots.filter((slot) => slot.reservedCount < slot.capacity);
  }

  listPickupSlotsForAdmin() {
    return this.prisma.pickupSlot.findMany({
      orderBy: [{ startsAt: 'desc' }],
      take: 200,
    });
  }

  async createPickupSlot(dto: CreatePickupSlotDto) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (startsAt <= new Date() || endsAt <= startsAt) {
      throw new BadRequestException('اختار موعدًا مستقبليًا، ويجب أن يكون وقت النهاية بعد البداية.');
    }
    return this.prisma.pickupSlot.create({
      data: { label: dto.label.trim(), startsAt, endsAt, capacity: dto.capacity },
    });
  }

  async updatePickupSlot(id: string, dto: UpdatePickupSlotDto) {
    const current = await this.prisma.pickupSlot.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('موعد الاستلام غير موجود.');
    const capacity = dto.capacity ?? current.capacity;
    if (capacity < current.reservedCount) {
      throw new BadRequestException('لا يمكن تقليل السعة إلى أقل من عدد الحجوزات الحالية.');
    }
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : current.startsAt;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : current.endsAt;
    if (endsAt <= startsAt) throw new BadRequestException('وقت النهاية يجب أن يكون بعد البداية.');
    return this.prisma.pickupSlot.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
        ...(dto.startsAt ? { startsAt } : {}),
        ...(dto.endsAt ? { endsAt } : {}),
        ...(dto.capacity !== undefined ? { capacity } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        updatedAt: new Date(),
      },
    });
  }

  async deactivatePickupSlot(id: string) {
    const current = await this.prisma.pickupSlot.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('موعد الاستلام غير موجود.');
    if (current.reservedCount > 0) {
      await this.prisma.pickupSlot.update({ where: { id }, data: { isActive: false, updatedAt: new Date() } });
      return { message: 'تم إيقاف الموعد للحجوزات الجديدة مع الحفاظ على الحجوزات الحالية.' };
    }
    await this.prisma.pickupSlot.delete({ where: { id } });
    return { message: 'تم حذف الموعد.' };
  }
}

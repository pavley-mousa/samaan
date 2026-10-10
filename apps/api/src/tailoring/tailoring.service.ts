import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateTailoringRequestDto } from './dto/create-tailoring-request.dto';
import { UpdateTailoringRequestDto } from './dto/update-tailoring-request.dto';

const measurementKeys = new Set([
  'height', 'shoulder', 'chest', 'waist', 'hip', 'sleeveLength', 'garmentLength',
  'neck', 'wrist', 'armhole', 'cuff',
]);

const allowedTransitions: Record<string, string[]> = {
  submitted: ['reviewing', 'quoted', 'rejected', 'cancelled'],
  reviewing: ['quoted', 'rejected', 'cancelled'],
  quoted: ['quoted', 'rejected', 'cancelled'],
  approved: ['in_production', 'cancelled'],
  in_production: ['ready'],
  ready: ['delivered'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

const requestInclude = {
  product: { select: { id: true, name: true, slug: true, productType: true, category: { select: { id: true, name: true, parentId: true } } } },
  fabricVariant: {
    select: {
      id: true,
      colorName: true,
      sizeLabel: true,
      product: { select: { id: true, name: true, fabricType: true } },
    },
  },
  pickupSlot: { select: { id: true, label: true, startsAt: true, endsAt: true } },
} satisfies Prisma.TailoringRequestInclude;

@Injectable()
export class TailoringService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, dto: CreateTailoringRequestDto) {
    const fabricDescription = dto.fabricDescription?.trim() || null;
    const customerNotes = dto.customerNotes?.trim() || null;
    if (!dto.productId && !dto.fabricVariantId && !fabricDescription && !customerNotes) {
      throw new BadRequestException('حدد موديل الجلابية أو الخامة أو اكتب تفاصيل الطلب.');
    }

    if (dto.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, isActive: true, productType: 'custom_galabiya' },
        select: { id: true },
      });
      if (!product) throw new BadRequestException('اختار منتج تفصيل متاحًا من المتجر.');
    }

    if (dto.fabricVariantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.fabricVariantId, isActive: true, product: { isActive: true, productType: 'fabric' } },
        select: { id: true },
      });
      if (!variant) throw new BadRequestException('الخامة المختارة غير متاحة حاليًا.');
    }

    const measurements = this.validateMeasurements(dto.bodyMeasurements ?? {});
    return this.prisma.tailoringRequest.create({
      data: {
        userId,
        ...(dto.productId ? { productId: dto.productId } : {}),
        ...(dto.fabricVariantId ? { fabricVariantId: dto.fabricVariantId } : {}),
        fabricDescription,
        colorName: dto.colorName?.trim() || null,
        sizeLabel: dto.sizeLabel?.trim() || null,
        bodyMeasurements: measurements as Prisma.InputJsonObject,
        customerNotes,
        status: 'submitted',
      },
      include: requestInclude,
    });
  }

  findMine(userId: string) {
    return this.prisma.tailoringRequest.findMany({
      where: { userId },
      include: requestInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAllForAdmin() {
    return this.prisma.tailoringRequest.findMany({
      include: {
        ...requestInclude,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async updateForAdmin(id: string, dto: UpdateTailoringRequestDto, adminId: string) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.tailoringRequest.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('طلب التفصيل غير موجود.');
      if (!allowedTransitions[current.status]?.includes(dto.status)) {
        throw new BadRequestException('انتقال حالة طلب التفصيل غير مسموح. راجع حالة الطلب الحالية.');
      }
      if (dto.status === 'quoted' && dto.quotedPrice === undefined) {
        throw new BadRequestException('أدخل السعر المقترح قبل إرسال عرض السعر.');
      }
      if (dto.status === 'in_production' && current.status !== 'approved') {
        throw new BadRequestException('لا يبدأ التنفيذ قبل موافقة العميل على عرض السعر.');
      }

      const updated = await tx.tailoringRequest.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.quotedPrice !== undefined ? { quotedPrice: new Prisma.Decimal(dto.quotedPrice) } : {}),
          ...(dto.estimatedDays !== undefined ? { estimatedDays: dto.estimatedDays } : {}),
          updatedAt: new Date(),
        },
        include: {
          ...requestInclude,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });

      if (dto.status === 'cancelled' && current.pickupSlotId) {
        await tx.pickupSlot.updateMany({
          where: { id: current.pickupSlotId, reservedCount: { gt: 0 } },
          data: { reservedCount: { decrement: 1 }, updatedAt: new Date() },
        });
      }
      void adminId;
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async approveQuote(userId: string, id: string) {
    const current = await this.prisma.tailoringRequest.findFirst({ where: { id, userId } });
    if (!current) throw new NotFoundException('طلب التفصيل غير موجود.');
    if (current.status !== 'quoted' || current.quotedPrice === null) {
      throw new BadRequestException('لا يوجد عرض سعر جاهز للموافقة عليه.');
    }
    return this.prisma.tailoringRequest.update({
      where: { id },
      data: { status: 'approved', updatedAt: new Date() },
      include: requestInclude,
    });
  }

  async choosePickupSlot(userId: string, requestId: string, pickupSlotId: string) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.tailoringRequest.findFirst({
        where: { id: requestId, userId },
        include: { pickupSlot: true },
      });
      if (!request) throw new NotFoundException('طلب التفصيل غير موجود.');
      if (!['approved', 'in_production', 'ready'].includes(request.status)) {
        throw new BadRequestException('اختيار موعد الاستلام متاح بعد الموافقة على عرض السعر.');
      }

      const now = new Date();
      const slot = await tx.pickupSlot.findUnique({ where: { id: pickupSlotId } });
      if (!slot || !slot.isActive || slot.startsAt <= now || slot.endsAt <= now) {
        throw new BadRequestException('موعد الاستلام غير متاح أو انتهى.');
      }
      if (request.pickupSlotId === slot.id) {
        return tx.tailoringRequest.findUnique({ where: { id: requestId }, include: requestInclude });
      }
      if (slot.reservedCount >= slot.capacity) {
        throw new BadRequestException('اكتمل عدد الحجوزات لهذا الموعد. اختار موعدًا آخر.');
      }

      if (request.pickupSlotId) {
        await tx.pickupSlot.updateMany({
          where: { id: request.pickupSlotId, reservedCount: { gt: 0 } },
          data: { reservedCount: { decrement: 1 } },
        });
      }

      const reserved = await tx.pickupSlot.updateMany({
        where: {
          id: slot.id,
          isActive: true,
          startsAt: { gt: now },
          endsAt: { gt: now },
          reservedCount: slot.reservedCount,
        },
        data: { reservedCount: { increment: 1 }, updatedAt: now },
      });
      if (reserved.count !== 1) {
        throw new BadRequestException('تم حجز هذا الموعد للتو. حدّث القائمة واختار موعدًا آخر.');
      }

      return tx.tailoringRequest.update({
        where: { id: requestId },
        data: { pickupSlotId: slot.id, updatedAt: now },
        include: requestInclude,
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancelByUser(userId: string, id: string) {
    const current = await this.prisma.tailoringRequest.findFirst({ where: { id, userId } });
    if (!current) throw new NotFoundException('طلب التفصيل غير موجود.');
    if (!['submitted', 'reviewing', 'quoted'].includes(current.status)) {
      throw new BadRequestException('لا يمكن إلغاء الطلب بعد اعتماد عرض السعر أو بدء التنفيذ. تواصل مع الإدارة.');
    }
    return this.prisma.tailoringRequest.update({
      where: { id },
      data: { status: 'cancelled', updatedAt: new Date() },
      include: requestInclude,
    });
  }

  private validateMeasurements(input: Record<string, unknown>): Record<string, number> {
    const output: Record<string, number> = {};
    for (const [key, raw] of Object.entries(input)) {
      if (!measurementKeys.has(key)) throw new BadRequestException('اسم أحد حقول المقاسات غير معروف.');
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(value) || value <= 0 || value > 300) {
        throw new BadRequestException('المقاسات يجب أن تكون أرقامًا موجبة بالسنتيمتر وبحد أقصى 300 سم.');
      }
      output[key] = value;
    }
    return output;
  }
}

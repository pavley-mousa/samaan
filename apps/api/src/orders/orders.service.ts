import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string, dto: CreateOrderDto) {
    const merged = new Map<string, { productId: string; variantId?: string; quantity: Prisma.Decimal }>();
    for (const line of dto.items) {
      const key = `${line.productId}:${line.variantId ?? 'custom'}`;
      const quantity = new Prisma.Decimal(line.quantity);
      const current = merged.get(key);
      merged.set(key, { productId: line.productId, variantId: line.variantId, quantity: current ? current.quantity.plus(quantity) : quantity });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const address = await tx.address.create({
        data: {
          userId,
          recipientName: dto.address.recipientName.trim(),
          phone: dto.address.phone.trim(),
          governorate: dto.address.governorate.trim(),
          city: dto.address.city.trim(),
          addressLine: dto.address.addressLine.trim(),
          notes: dto.address.notes?.trim() || null,
        },
      });

      const orderLines: Prisma.OrderItemCreateWithoutOrderInput[] = [];
      let subtotal = new Prisma.Decimal(0);
      for (const line of merged.values()) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { variants: true },
        });
        if (!product || !product.isActive) throw new BadRequestException('أحد المنتجات لم يعد متاحًا. حدّث السلة وحاول مرة أخرى.');

        let variant: (typeof product.variants)[number] | null = null;
        let unitPrice = product.basePrice;
        let variantDescription: string | null = null;
        if (line.variantId) {
          variant = product.variants.find((candidate) => candidate.id === line.variantId) ?? null;
          if (!variant || !variant.isActive) throw new BadRequestException(`اللون أو المقاس غير متاح في المنتج: ${product.name}.`);
          unitPrice = variant.price ?? product.basePrice;
          variantDescription = [variant.colorName, variant.sizeLabel].filter(Boolean).join(' - ') || null;
          const decremented = await tx.productVariant.updateMany({
            where: { id: variant.id, productId: product.id, isActive: true, stockQuantity: { gte: line.quantity } },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (decremented.count !== 1) throw new BadRequestException(`الكمية المطلوبة غير متاحة في المخزون: ${product.name}.`);
        } else if (product.productType !== 'custom_galabiya') {
          throw new BadRequestException(`اختار اللون أو المقاس أولًا: ${product.name}.`);
        }

        if (line.quantity.lessThan(new Prisma.Decimal(product.minimumQuantity))) {
          throw new BadRequestException(`الحد الأدنى للشراء في ${product.name} هو ${product.minimumQuantity.toString()}.`);
        }
        if (product.unit === 'piece' && line.quantity.decimalPlaces() > 0) {
          throw new BadRequestException(`الكمية في المنتج ${product.name} يجب أن تكون عددًا صحيحًا من القطع.`);
        }
        const lineTotal = unitPrice.mul(line.quantity).toDecimalPlaces(2);
        subtotal = subtotal.plus(lineTotal);
        orderLines.push({
          product: { connect: { id: product.id } },
          ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
          productName: product.name,
          variantDescription,
          unit: product.unit,
          quantity: line.quantity,
          unitPrice,
          lineTotal,
        });
      }

      const order = await tx.order.create({
        data: {
          user: { connect: { id: userId } },
          address: { connect: { id: address.id } },
          status: 'pending',
          paymentMethod: 'cash_on_delivery',
          paymentStatus: 'unpaid',
          subtotal,
          shippingFee: new Prisma.Decimal(0),
          discount: new Prisma.Decimal(0),
          total: subtotal,
          customerNotes: dto.customerNotes?.trim() || null,
          items: { create: orderLines },
        },
        include: { items: true },
      });
      return order;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return { ...result, orderNumber: result.orderNumber.toString() };
  }

  async findMine(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true, address: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => ({ ...order, orderNumber: order.orderNumber.toString() }));
  }

  async findOneForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: true, address: true, user: { select: { id: true, name: true, email: true } } },
    });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    return { ...order, orderNumber: order.orderNumber.toString() };
  }

  async findAllForAdmin() {
    const orders = await this.prisma.order.findMany({
      include: { items: true, address: true, user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return orders.map((order) => ({ ...order, orderNumber: order.orderNumber.toString() }));
  }


  async updatePaymentStatus(orderId: string, nextStatus: 'unpaid' | 'paid') {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('الطلب غير موجود.');
    if (order.status === 'cancelled') {
      throw new BadRequestException('لا يمكن تسجيل تحصيل مبلغ لطلب ملغي.');
    }
    if (nextStatus === 'paid') {
      if (order.paymentMethod !== 'cash_on_delivery') {
        throw new BadRequestException('تأكيد الدفع الإلكتروني غير متاح قبل ربط بوابة دفع والتحقق من إشعارها.');
      }
      if (order.paymentStatus === 'paid') return { ...order, orderNumber: order.orderNumber.toString() };
      return this.prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'paid', updatedAt: new Date() },
      }).then((updated) => ({ ...updated, orderNumber: updated.orderNumber.toString() }));
    }
    if (order.paymentStatus === 'paid') {
      throw new BadRequestException('لا يمكن إرجاع الطلب إلى غير مدفوع بعد تسجيل التحصيل. يلزم إجراء مرتجع/استرداد موثق.');
    }
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'unpaid', updatedAt: new Date() },
    });
    return { ...updated, orderNumber: updated.orderNumber.toString() };
  }

  async updateStatus(orderId: string, nextStatus: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
      if (!order) throw new NotFoundException('الطلب غير موجود.');
      if (order.status === 'cancelled' && nextStatus !== 'cancelled') {
        throw new BadRequestException('لا يمكن إعادة فتح طلب ملغي تلقائيًا. أنشئ طلبًا جديدًا بدلًا منه.');
      }
      if (nextStatus === 'cancelled' && ['shipped', 'delivered', 'returned'].includes(order.status)) {
        throw new BadRequestException('لا يمكن إلغاء طلب تم شحنه أو تسليمه؛ راجع الإدارة لمعالجة المرتجع.');
      }
      if (nextStatus === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          if (item.variantId) {
            await tx.productVariant.update({ where: { id: item.variantId }, data: { stockQuantity: { increment: item.quantity } } });
          }
        }
      }
      const updated = await tx.order.update({ where: { id: orderId }, data: { status: nextStatus, updatedAt: new Date() } });
      return { ...updated, orderNumber: updated.orderNumber.toString() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

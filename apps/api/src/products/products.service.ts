import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';

const productInclude = {
  category: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: [{ colorName: 'asc' as const }, { sizeLabel: 'asc' as const }] },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { productType?: string; categoryId?: string; search?: string; limit?: number; includeInactive?: boolean } = {}) {
    const where: Prisma.ProductWhereInput = {
      ...(filters.includeInactive ? {} : { isActive: true }),
      ...(filters.productType ? { productType: filters.productType } : {}),
      ...(filters.search?.trim() ? {
        OR: [
          { name: { contains: filters.search.trim(), mode: 'insensitive' } },
          { description: { contains: filters.search.trim(), mode: 'insensitive' } },
          { fabricType: { contains: filters.search.trim(), mode: 'insensitive' } },
        ],
      } : {}),
    };
    if (filters.categoryId) {
      const selectedCategory = await this.prisma.category.findUnique({
        where: { id: filters.categoryId },
        select: { id: true, parentId: true, isActive: true },
      });
      if (selectedCategory?.isActive && !selectedCategory.parentId) {
        const children = await this.prisma.category.findMany({
          where: { parentId: selectedCategory.id, isActive: true },
          select: { id: true },
        });
        where.categoryId = { in: [selectedCategory.id, ...children.map((child) => child.id)] };
      } else {
        where.categoryId = filters.categoryId;
      }
    }
    const products = await this.prisma.product.findMany({
      where,
      include: {
        ...productInclude,
        variants: {
          ...productInclude.variants,
          ...(filters.includeInactive ? {} : { where: { isActive: true } }),
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(filters.limit ?? 60, 1), 100),
    });
    return products.map((product) => this.withStockSummary(product));
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: {
        ...productInclude,
        variants: { ...productInclude.variants, where: { isActive: true } },
      },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود أو لم يعد متاحًا.');
    return this.withStockSummary(product);
  }

  async create(dto: CreateProductDto) {
    const { imageUrls, ...fields } = dto;
    if (fields.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: fields.categoryId }, select: { id: true, productType: true, parentId: true, isActive: true } });
      if (!category || !category.isActive) throw new BadRequestException('التصنيف المختار غير متاح.');
      if (category.productType && category.productType !== fields.productType) throw new BadRequestException('نوع التصنيف لا يطابق نوع المنتج.');
    }
    const product = await this.prisma.product.create({
      data: {
        ...fields,
        basePrice: new Prisma.Decimal(fields.basePrice),
        minimumQuantity: new Prisma.Decimal(fields.minimumQuantity ?? 1),
        images: imageUrls?.length ? { create: imageUrls.map((imageUrl, sortOrder) => ({ imageUrl, sortOrder, altText: fields.name })) } : undefined,
      },
      include: productInclude,
    });
    return this.withStockSummary(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!current) throw new NotFoundException('المنتج غير موجود.');
    const { imageUrls, basePrice, minimumQuantity, ...fields } = dto;
    if (fields.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: fields.categoryId }, select: { id: true, productType: true, isActive: true } });
      if (!category || !category.isActive) throw new BadRequestException('التصنيف المختار غير متاح.');
      if (category.productType && category.productType !== (fields.productType ?? (await this.prisma.product.findUnique({ where: { id }, select: { productType: true } }))?.productType)) {
        throw new BadRequestException('نوع التصنيف لا يطابق نوع المنتج.');
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...fields,
          ...(basePrice !== undefined ? { basePrice: new Prisma.Decimal(basePrice) } : {}),
          ...(minimumQuantity !== undefined ? { minimumQuantity: new Prisma.Decimal(minimumQuantity) } : {}),
          updatedAt: new Date(),
        },
      });
      if (imageUrls !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (imageUrls.length) {
          await tx.productImage.createMany({ data: imageUrls.map((imageUrl, sortOrder) => ({ productId: id, imageUrl, sortOrder, altText: dto.name ?? current.name })) });
        }
      }
    });
    const updated = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!updated) throw new NotFoundException('المنتج غير موجود.');
    return this.withStockSummary(updated);
  }

  async archive(id: string) {
    const result = await this.prisma.product.updateMany({ where: { id }, data: { isActive: false, updatedAt: new Date() } });
    if (result.count === 0) throw new NotFoundException('المنتج غير موجود.');
    return { message: 'تم إخفاء المنتج من المتجر.' };
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const parent = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!parent) throw new NotFoundException('المنتج غير موجود.');
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku?.trim() || null,
        colorName: dto.colorName?.trim() || null,
        colorHex: dto.colorHex?.trim() || null,
        sizeLabel: dto.sizeLabel?.trim() || null,
        price: dto.price === undefined ? null : new Prisma.Decimal(dto.price),
        stockQuantity: new Prisma.Decimal(dto.stockQuantity),
        isActive: dto.isActive ?? true,
      },
    });
    return variant;
  }

  async updateVariant(productId: string, variantId: string, dto: UpdateVariantDto) {
    const exists = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
    if (!exists) throw new NotFoundException('المقاس أو اللون غير موجود لهذا المنتج.');
    const { price, stockQuantity, ...fields } = dto;
    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...fields,
        ...(price !== undefined ? { price: price === null ? null : new Prisma.Decimal(price) } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity: new Prisma.Decimal(stockQuantity) } : {}),
      },
    });
  }

  private withStockSummary<T extends { variants: Array<{ stockQuantity: Prisma.Decimal | number }> }>(product: T) {
    return {
      ...product,
      stockQuantity: product.variants.reduce((sum, variant) => sum + Number(variant.stockQuantity), 0),
    };
  }
}

import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.module';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminCategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.category.findMany({
      include: { parent: { select: { id: true, name: true, productType: true } }, _count: { select: { products: true, children: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    const parent = dto.parentId ? await this.prisma.category.findUnique({ where: { id: dto.parentId } }) : null;
    if (dto.parentId && !parent) throw new NotFoundException('الفئة الرئيسية غير موجودة.');
    if (parent?.productType && dto.productType && parent.productType !== dto.productType) {
      throw new BadRequestException('نوع المنتج في الفئة الفرعية يجب أن يطابق نوع الفئة الرئيسية.');
    }
    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug: dto.slug.trim().toLowerCase(),
        description: dto.description?.trim() || null,
        parentId: parent?.id ?? null,
        productType: dto.productType ?? parent?.productType ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('الفئة غير موجودة.');
    const parentId = dto.parentId === undefined ? current.parentId : (dto.parentId || null);
    if (parentId === id) throw new BadRequestException('الفئة لا يمكن أن تكون فئة رئيسية لنفسها.');
    const parent = parentId ? await this.prisma.category.findUnique({ where: { id: parentId } }) : null;
    if (parentId && !parent) throw new NotFoundException('الفئة الرئيسية غير موجودة.');
    if (parent && (parent.parentId === id || parent.productType && (dto.productType ?? current.productType) && parent.productType !== (dto.productType ?? current.productType))) {
      throw new BadRequestException('اختيار الفئة الرئيسية غير صالح أو نوعها لا يطابق نوع الفئة.');
    }
    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.slug !== undefined ? { slug: dto.slug.trim().toLowerCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
        ...(dto.parentId !== undefined ? { parentId } : {}),
        ...(dto.productType !== undefined ? { productType: dto.productType || null } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  @Delete(':id')
  async archive(@Param('id') id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!category) throw new NotFoundException('الفئة غير موجودة.');
    if (category._count.products || category._count.children) {
      return this.prisma.category.update({ where: { id }, data: { isActive: false } });
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: 'تم حذف الفئة.' };
  }
}

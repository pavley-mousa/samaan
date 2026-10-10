import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: { parent: { select: { id: true, name: true, productType: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }
}

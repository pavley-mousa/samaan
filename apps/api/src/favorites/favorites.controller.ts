import { Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

type RequestWithUser = Request & { user: Pick<User, 'id'> };

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favorites: FavoritesService) {}

  @Get()
  findMine(@Req() request: RequestWithUser) {
    return this.favorites.findMine(request.user.id);
  }

  @Post(':productId')
  add(@Req() request: RequestWithUser, @Param('productId') productId: string) {
    return this.favorites.add(request.user.id, productId);
  }

  @Delete(':productId')
  remove(@Req() request: RequestWithUser, @Param('productId') productId: string) {
    return this.favorites.remove(request.user.id, productId);
  }
}

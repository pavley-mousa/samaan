import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const PRODUCT_TYPES = ['fabric', 'ready_galabiya', 'custom_galabiya', 'accessory'];

export class CreateCategoryDto {
  @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @IsString() @MinLength(2) @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string;

  @IsOptional() @IsUUID()
  parentId?: string;

  @IsOptional() @IsIn(PRODUCT_TYPES)
  productType?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(1000)
  description?: string | null;

  @IsOptional() @IsUUID()
  parentId?: string | null;

  @IsOptional() @IsIn(PRODUCT_TYPES)
  productType?: string | null;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  sortOrder?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

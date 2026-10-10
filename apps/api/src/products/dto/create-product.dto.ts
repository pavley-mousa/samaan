import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, IsUrl, MaxLength, Min, MinLength } from 'class-validator';

const PRODUCT_TYPES = ['fabric', 'ready_galabiya', 'custom_galabiya', 'accessory'];
const SEASONS = ['summer', 'winter', 'all_season'];

export class CreateProductDto {
  @IsString() @MinLength(2) @MaxLength(160)
  name!: string;

  @IsString() @MinLength(2) @MaxLength(180)
  slug!: string;

  @IsIn(PRODUCT_TYPES)
  productType!: string;

  @IsIn(['meter', 'piece'])
  unit!: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  basePrice!: number;

  @IsOptional() @IsUUID()
  categoryId?: string;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(120)
  fabricType?: string;

  @IsOptional() @IsIn(SEASONS)
  season?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  minimumQuantity?: number;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsArray() @IsUrl({}, { each: true })
  imageUrls?: string[];
}

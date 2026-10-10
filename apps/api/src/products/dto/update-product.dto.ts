import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, IsUrl, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  name?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(180)
  slug?: string;

  @IsOptional() @IsIn(['fabric', 'ready_galabiya', 'custom_galabiya', 'accessory'])
  productType?: string;

  @IsOptional() @IsIn(['meter', 'piece'])
  unit?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  basePrice?: number;

  @IsOptional() @IsUUID()
  categoryId?: string | null;

  @IsOptional() @IsString() @MaxLength(5000)
  description?: string | null;

  @IsOptional() @IsString() @MaxLength(120)
  fabricType?: string | null;

  @IsOptional() @IsIn(['summer', 'winter', 'all_season'])
  season?: string | null;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  minimumQuantity?: number;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsArray() @IsUrl({}, { each: true })
  imageUrls?: string[];
}

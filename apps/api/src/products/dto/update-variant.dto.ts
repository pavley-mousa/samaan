import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateVariantDto {
  @IsOptional() @IsString() @MaxLength(80)
  sku?: string | null;

  @IsOptional() @IsString() @MaxLength(80)
  colorName?: string | null;

  @IsOptional() @IsString() @MaxLength(7)
  colorHex?: string | null;

  @IsOptional() @IsString() @MaxLength(50)
  sizeLabel?: string | null;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  price?: number | null;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  stockQuantity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

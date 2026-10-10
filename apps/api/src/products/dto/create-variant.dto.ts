import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVariantDto {
  @IsOptional() @IsString() @MaxLength(80)
  sku?: string;

  @IsOptional() @IsString() @MaxLength(80)
  colorName?: string;

  @IsOptional() @IsString() @MaxLength(7)
  colorHex?: string;

  @IsOptional() @IsString() @MaxLength(50)
  sizeLabel?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  price?: number;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0)
  stockQuantity!: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

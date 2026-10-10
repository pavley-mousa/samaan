import { IsObject, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateTailoringRequestDto {
  @IsOptional() @IsUUID()
  productId?: string;

  @IsOptional() @IsUUID()
  fabricVariantId?: string;

  @IsOptional() @IsString() @MaxLength(120)
  fabricDescription?: string;

  @IsOptional() @IsString() @MaxLength(80)
  colorName?: string;

  @IsOptional() @IsString() @MaxLength(80)
  sizeLabel?: string;

  @IsOptional() @IsObject()
  bodyMeasurements?: Record<string, unknown>;

  @IsOptional() @IsString() @MinLength(5) @MaxLength(2000)
  customerNotes?: string;
}

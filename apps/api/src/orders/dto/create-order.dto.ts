import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateNested, IsNumber, Min } from 'class-validator';

export class OrderLineDto {
  @IsUUID()
  productId!: string;

  @IsOptional() @IsUUID()
  variantId?: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01)
  quantity!: number;
}

export class OrderAddressDto {
  @IsString() @MinLength(2) @MaxLength(120)
  recipientName!: string;

  @IsString() @MinLength(7) @MaxLength(30)
  phone!: string;

  @IsString() @MinLength(2) @MaxLength(80)
  governorate!: string;

  @IsString() @MinLength(2) @MaxLength(100)
  city!: string;

  @IsString() @MinLength(5) @MaxLength(500)
  addressLine!: string;

  @IsOptional() @IsString() @MaxLength(1000)
  notes?: string;
}

export class CreateOrderDto {
  @ValidateNested() @Type(() => OrderAddressDto)
  address!: OrderAddressDto;

  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => OrderLineDto)
  items!: OrderLineDto[];

  @IsOptional() @IsString() @MaxLength(1000)
  customerNotes?: string;
}

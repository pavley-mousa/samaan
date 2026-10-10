import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePickupSlotDto {
  @IsString() @MinLength(2) @MaxLength(160)
  label!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  capacity!: number;
}

export class UpdatePickupSlotDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  label?: string;

  @IsOptional() @IsDateString()
  startsAt?: string;

  @IsOptional() @IsDateString()
  endsAt?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  capacity?: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

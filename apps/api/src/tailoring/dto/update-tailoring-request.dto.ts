import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export const TAILORING_STATUSES = [
  'submitted',
  'reviewing',
  'quoted',
  'approved',
  'in_production',
  'ready',
  'delivered',
  'rejected',
  'cancelled',
] as const;

export class UpdateTailoringRequestDto {
  @IsIn(TAILORING_STATUSES)
  status!: (typeof TAILORING_STATUSES)[number];

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10000000)
  quotedPrice?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(365)
  estimatedDays?: number;
}

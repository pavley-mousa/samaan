import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export class MeasurementVideoDto {
  @IsOptional() @IsString() @MaxLength(2048)
  videoUrl?: string | null;
}

export class CreateMeasurementVideoUploadDto {
  @IsString() @MaxLength(180)
  filename!: string;

  @IsIn(VIDEO_TYPES)
  contentType!: (typeof VIDEO_TYPES)[number];

  @Type(() => Number) @IsInt() @Min(1) @Max(104857600)
  fileSize!: number;
}

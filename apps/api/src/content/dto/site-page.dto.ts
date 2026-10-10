import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSitePageDto {
  @IsString() @MinLength(2) @MaxLength(160)
  title!: string;

  @IsString() @MinLength(2) @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString() @MaxLength(30000)
  content!: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  showInFooter?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  sortOrder?: number;
}

export class UpdateSitePageDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160)
  title?: string;

  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsOptional() @IsString() @MaxLength(30000)
  content?: string;

  @IsOptional() @IsBoolean()
  isPublished?: boolean;

  @IsOptional() @IsBoolean()
  showInFooter?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10000)
  sortOrder?: number;
}

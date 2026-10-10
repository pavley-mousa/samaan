import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestEmailOtpDto {
  @IsEmail() @MaxLength(254)
  email!: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  firstName?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  lastName?: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;
}

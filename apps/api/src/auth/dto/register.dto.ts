import { IsEmail, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  firstName?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(60)
  lastName?: string;

  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @MinLength(10) @MaxLength(72)
  password!: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;
}

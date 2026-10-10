import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @MinLength(10) @MaxLength(72)
  password!: string;

  @IsOptional() @IsString() @MaxLength(30)
  phone?: string;
}

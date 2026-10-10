import { IsEmail, IsString, Matches, MaxLength } from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail() @MaxLength(254)
  email!: string;

  @IsString() @Matches(/^\d{6}$/)
  code!: string;
}

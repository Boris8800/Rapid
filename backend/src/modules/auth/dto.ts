import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class MagicLinkRequestDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

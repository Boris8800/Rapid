import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

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
  @IsIn(['customer', 'driver', 'admin'])
  tenant?: 'customer' | 'driver' | 'admin';

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}

export class MagicLinkConsumeDto {
  @IsString()
  @MinLength(16)
  token!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

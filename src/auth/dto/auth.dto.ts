import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    @MinLength(2)
    name: string;

    @IsOptional()
    @IsString()
    phone?: string;
}

export class OtpDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    otp: string;
}

export class RequestOtpDto {
    @IsEmail()
    email: string;
}

export class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}

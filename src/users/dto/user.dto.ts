import { IsString, IsOptional, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    avatarUrl?: string;
}

export class ChangePasswordDto {
    @IsString()
    @MinLength(6)
    currentPassword: string;

    @IsString()
    @MinLength(6)
    newPassword: string;
}

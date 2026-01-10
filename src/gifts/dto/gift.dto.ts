import {
    IsString,
    IsOptional,
    IsInt,
    Min,
    Max,
    IsUUID,
    IsArray,
    ValidateNested,
    IsIn,
    IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGiftDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsInt()
    @Min(0)
    pointsRequired: number;

    @IsInt()
    @Min(0)
    stock: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    isActive?: boolean;
}

export class UpdateGiftDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    pointsRequired?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    stock?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    isActive?: boolean;
}

export class GiftQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsIn(['createdAt', 'rating', 'pointsRequired', 'name'])
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    order?: string = 'DESC';

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(5)
    minRating?: number;
}

export class RedeemGiftDto {
    @IsInt()
    @Min(1)
    quantity: number = 1;
}

export class RedeemMultipleDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RedeemItemDto)
    items: RedeemItemDto[];
}

export class RedeemItemDto {
    @IsUUID()
    giftId: string;

    @IsInt()
    @Min(1)
    quantity: number;
}

export class RatingDto {
    @IsInt()
    @Min(1)
    @Max(5)
    stars: number;

    @IsOptional()
    @IsString()
    review?: string;

    @IsUUID()
    redemptionId: string;
}

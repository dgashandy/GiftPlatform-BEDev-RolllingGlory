import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
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
    @IsIn(['createdAt', 'rating', 'name', 'pointsRequired'])
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC', 'asc', 'desc'])
    order?: string = 'DESC';
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    links: {
        self: string;
        next: string | null;
        prev: string | null;
    };
}

export function createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    baseUrl: string,
): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        meta: {
            page,
            limit,
            total,
            totalPages,
        },
        links: {
            self: `${baseUrl}?page=${page}&limit=${limit}`,
            next: page < totalPages ? `${baseUrl}?page=${page + 1}&limit=${limit}` : null,
            prev: page > 1 ? `${baseUrl}?page=${page - 1}&limit=${limit}` : null,
        },
    };
}

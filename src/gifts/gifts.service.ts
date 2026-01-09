import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { eq, desc, asc, sql, and, like, count } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { UsersService } from '../users/users.service';
import {
    CreateGiftDto,
    UpdateGiftDto,
    GiftQueryDto,
    RedeemGiftDto,
    RatingDto,
} from './dto';
import { createPaginatedResult } from '../common';

@Injectable()
export class GiftsService {
    constructor(
        @Inject(DRIZZLE) private db: any,
        private usersService: UsersService,
    ) { }

    private calculateStarRating(avgRating: string | number): number {
        const rating = typeof avgRating === 'string' ? parseFloat(avgRating) : avgRating;
        return Math.round(rating * 2) / 2;
    }

    async findAll(query: GiftQueryDto) {
        const { page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC', categoryId, search, minRating } = query;
        const offset = (page - 1) * limit;

        const conditions = [eq(schema.gifts.isActive, true)];

        if (categoryId) {
            conditions.push(eq(schema.gifts.categoryId, categoryId));
        }

        if (search) {
            conditions.push(sql`LOWER(${schema.gifts.name}) LIKE LOWER(${'%' + search + '%'})`);
        }

        if (minRating !== undefined && minRating > 0) {
            conditions.push(sql`CAST(${schema.gifts.avgRating} AS DECIMAL) >= ${minRating}`);
        }

        const [{ total }] = await this.db
            .select({ total: count() })
            .from(schema.gifts)
            .where(and(...conditions));

        const orderDirection = order.toUpperCase() === 'ASC' ? asc : desc;
        let orderColumn: any;

        switch (sortBy) {
            case 'rating':
                orderColumn = schema.gifts.avgRating;
                break;
            case 'pointsRequired':
                orderColumn = schema.gifts.pointsRequired;
                break;
            case 'name':
                orderColumn = schema.gifts.name;
                break;
            default:
                orderColumn = schema.gifts.createdAt;
        }

        const gifts = await this.db
            .select({
                id: schema.gifts.id,
                name: schema.gifts.name,
                description: schema.gifts.description,
                categoryId: schema.gifts.categoryId,
                categoryName: schema.categories.name,
                pointsRequired: schema.gifts.pointsRequired,
                stock: schema.gifts.stock,
                imageUrl: schema.gifts.imageUrl,
                avgRating: schema.gifts.avgRating,
                totalReviews: schema.gifts.totalReviews,
                isActive: schema.gifts.isActive,
                createdAt: schema.gifts.createdAt,
            })
            .from(schema.gifts)
            .leftJoin(schema.categories, eq(schema.gifts.categoryId, schema.categories.id))
            .where(and(...conditions))
            .orderBy(orderDirection(orderColumn))
            .limit(limit)
            .offset(offset);

        const giftsWithStars = gifts.map((gift) => ({
            ...gift,
            starRating: this.calculateStarRating(gift.avgRating || '0'),
            inStock: gift.stock > 0,
        }));

        return createPaginatedResult(giftsWithStars, total, page, limit, '/gifts');
    }

    async findOne(id: string) {
        const [gift] = await this.db
            .select({
                id: schema.gifts.id,
                name: schema.gifts.name,
                description: schema.gifts.description,
                categoryId: schema.gifts.categoryId,
                categoryName: schema.categories.name,
                pointsRequired: schema.gifts.pointsRequired,
                stock: schema.gifts.stock,
                imageUrl: schema.gifts.imageUrl,
                avgRating: schema.gifts.avgRating,
                totalReviews: schema.gifts.totalReviews,
                isActive: schema.gifts.isActive,
                createdAt: schema.gifts.createdAt,
            })
            .from(schema.gifts)
            .leftJoin(schema.categories, eq(schema.gifts.categoryId, schema.categories.id))
            .where(eq(schema.gifts.id, id))
            .limit(1);

        if (!gift) {
            throw new NotFoundException('Gift not found');
        }

        const recentRatings = await this.db
            .select({
                id: schema.ratings.id,
                stars: schema.ratings.stars,
                review: schema.ratings.review,
                createdAt: schema.ratings.createdAt,
                userName: schema.users.name,
            })
            .from(schema.ratings)
            .leftJoin(schema.users, eq(schema.ratings.userId, schema.users.id))
            .where(eq(schema.ratings.giftId, id))
            .orderBy(desc(schema.ratings.createdAt))
            .limit(5);

        return {
            ...gift,
            starRating: this.calculateStarRating(gift.avgRating || '0'),
            inStock: gift.stock > 0,
            recentRatings,
        };
    }

    async create(createDto: CreateGiftDto) {
        const [gift] = await this.db
            .insert(schema.gifts)
            .values(createDto)
            .returning();

        return gift;
    }

    async update(id: string, updateDto: UpdateGiftDto) {
        const [existing] = await this.db
            .select()
            .from(schema.gifts)
            .where(eq(schema.gifts.id, id))
            .limit(1);

        if (!existing) {
            throw new NotFoundException('Gift not found');
        }

        const [updated] = await this.db
            .update(schema.gifts)
            .set({
                ...updateDto,
                updatedAt: new Date(),
            })
            .where(eq(schema.gifts.id, id))
            .returning();

        return updated;
    }

    async remove(id: string) {
        const [existing] = await this.db
            .select()
            .from(schema.gifts)
            .where(eq(schema.gifts.id, id))
            .limit(1);

        if (!existing) {
            throw new NotFoundException('Gift not found');
        }

        await this.db.delete(schema.gifts).where(eq(schema.gifts.id, id));

        return { message: 'Gift deleted successfully' };
    }

    async redeem(userId: string, giftId: string, redeemDto: RedeemGiftDto) {
        const { quantity } = redeemDto;

        const [gift] = await this.db
            .select()
            .from(schema.gifts)
            .where(eq(schema.gifts.id, giftId))
            .limit(1);

        if (!gift) {
            throw new NotFoundException('Gift not found');
        }

        if (!gift.isActive) {
            throw new BadRequestException('This gift is not available');
        }

        if (gift.stock < quantity) {
            throw new BadRequestException(`Insufficient stock. Available: ${gift.stock}`);
        }

        const totalPoints = gift.pointsRequired * quantity;

        const userBalance = await this.usersService.getPointBalance(userId);
        if (userBalance < totalPoints) {
            throw new BadRequestException(`Insufficient points. Required: ${totalPoints}, Available: ${userBalance}`);
        }

        const [redemption] = await this.db
            .insert(schema.redemptions)
            .values({
                userId,
                giftId,
                quantity,
                pointsSpent: totalPoints,
                status: 'completed',
            })
            .returning();

        await this.usersService.deductPoints(
            userId,
            totalPoints,
            `Redeemed ${quantity}x ${gift.name}`,
            redemption.id,
        );

        await this.db
            .update(schema.gifts)
            .set({
                stock: gift.stock - quantity,
                updatedAt: new Date(),
            })
            .where(eq(schema.gifts.id, giftId));

        return {
            redemption,
            message: `Successfully redeemed ${quantity}x ${gift.name}`,
            pointsSpent: totalPoints,
        };
    }

    async redeemMultiple(userId: string, items: { giftId: string; quantity: number }[]) {
        let totalPointsRequired = 0;
        const validatedItems: { gift: any; quantity: number }[] = [];

        for (const item of items) {
            const [gift] = await this.db
                .select()
                .from(schema.gifts)
                .where(eq(schema.gifts.id, item.giftId))
                .limit(1);

            if (!gift) {
                throw new NotFoundException(`Gift ${item.giftId} not found`);
            }

            if (!gift.isActive) {
                throw new BadRequestException(`Gift ${gift.name} is not available`);
            }

            if (gift.stock < item.quantity) {
                throw new BadRequestException(`Insufficient stock for ${gift.name}. Available: ${gift.stock}`);
            }

            totalPointsRequired += gift.pointsRequired * item.quantity;
            validatedItems.push({ gift, quantity: item.quantity });
        }

        const userBalance = await this.usersService.getPointBalance(userId);
        if (userBalance < totalPointsRequired) {
            throw new BadRequestException(`Insufficient points. Required: ${totalPointsRequired}, Available: ${userBalance}`);
        }

        const redemptions: any[] = [];

        for (const { gift, quantity } of validatedItems) {
            const [redemption] = await this.db
                .insert(schema.redemptions)
                .values({
                    userId,
                    giftId: gift.id,
                    quantity,
                    pointsSpent: gift.pointsRequired * quantity,
                    status: 'completed',
                })
                .returning();

            redemptions.push(redemption);

            await this.db
                .update(schema.gifts)
                .set({
                    stock: gift.stock - quantity,
                    updatedAt: new Date(),
                })
                .where(eq(schema.gifts.id, gift.id));
        }

        await this.usersService.deductPoints(
            userId,
            totalPointsRequired,
            `Redeemed ${items.length} items`,
        );

        return {
            redemptions,
            totalPointsSpent: totalPointsRequired,
            message: `Successfully redeemed ${items.length} items`,
        };
    }

    async addRating(userId: string, giftId: string, ratingDto: RatingDto) {
        const [redemption] = await this.db
            .select()
            .from(schema.redemptions)
            .where(
                and(
                    eq(schema.redemptions.id, ratingDto.redemptionId),
                    eq(schema.redemptions.userId, userId),
                    eq(schema.redemptions.giftId, giftId),
                ),
            )
            .limit(1);

        if (!redemption) {
            throw new BadRequestException('You can only rate gifts you have redeemed');
        }

        const [existingRating] = await this.db
            .select()
            .from(schema.ratings)
            .where(eq(schema.ratings.redemptionId, ratingDto.redemptionId))
            .limit(1);

        if (existingRating) {
            throw new BadRequestException('You have already rated this redemption');
        }

        const [rating] = await this.db
            .insert(schema.ratings)
            .values({
                userId,
                giftId,
                redemptionId: ratingDto.redemptionId,
                stars: ratingDto.stars,
                review: ratingDto.review,
            })
            .returning();

        const ratingStats = await this.db
            .select({
                avgRating: sql<string>`AVG(${schema.ratings.stars})::numeric(3,2)`,
                totalReviews: count(),
            })
            .from(schema.ratings)
            .where(eq(schema.ratings.giftId, giftId));

        await this.db
            .update(schema.gifts)
            .set({
                avgRating: ratingStats[0].avgRating,
                totalReviews: ratingStats[0].totalReviews,
                updatedAt: new Date(),
            })
            .where(eq(schema.gifts.id, giftId));

        return rating;
    }

    async getCategories() {
        const categories = await this.db
            .select()
            .from(schema.categories)
            .where(eq(schema.categories.isActive, true))
            .orderBy(asc(schema.categories.name));

        return categories;
    }
}

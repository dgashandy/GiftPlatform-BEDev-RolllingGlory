import {
    Injectable,
    Inject,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { UpdateProfileDto, ChangePasswordDto } from './dto';

@Injectable()
export class UsersService {
    constructor(@Inject(DRIZZLE) private db: any) { }

    async getProfile(userId: string) {
        const [user] = await this.db
            .select({
                id: schema.users.id,
                email: schema.users.email,
                name: schema.users.name,
                phone: schema.users.phone,
                avatarUrl: schema.users.avatarUrl,
                isVerified: schema.users.isVerified,
                createdAt: schema.users.createdAt,
                role: schema.roles.name,
            })
            .from(schema.users)
            .leftJoin(schema.roles, eq(schema.users.roleId, schema.roles.id))
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const pointBalance = await this.getPointBalance(userId);

        return {
            ...user,
            pointBalance,
        };
    }

    async updateProfile(userId: string, updateDto: UpdateProfileDto) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const [updatedUser] = await this.db
            .update(schema.users)
            .set({
                ...updateDto,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, userId))
            .returning();

        return {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            phone: updatedUser.phone,
            avatarUrl: updatedUser.avatarUrl,
        };
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (!user.passwordHash) {
            throw new BadRequestException('No password set for this account');
        }

        const isPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            user.passwordHash,
        );

        if (!isPasswordValid) {
            throw new BadRequestException('Current password is incorrect');
        }

        const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);

        await this.db
            .update(schema.users)
            .set({
                passwordHash: newPasswordHash,
                updatedAt: new Date(),
            })
            .where(eq(schema.users.id, userId));

        return { message: 'Password changed successfully' };
    }

    async getPointBalance(userId: string): Promise<number> {
        const [latestBalance] = await this.db
            .select({ balanceAfter: schema.pointBalance.balanceAfter })
            .from(schema.pointBalance)
            .where(eq(schema.pointBalance.userId, userId))
            .orderBy(desc(schema.pointBalance.createdAt))
            .limit(1);

        return latestBalance?.balanceAfter || 0;
    }

    async getPointHistory(userId: string, limit: number = 20) {
        const history = await this.db
            .select()
            .from(schema.pointBalance)
            .where(eq(schema.pointBalance.userId, userId))
            .orderBy(desc(schema.pointBalance.createdAt))
            .limit(limit);

        return history;
    }

    async addPoints(userId: string, amount: number, description: string, referenceId?: string) {
        const currentBalance = await this.getPointBalance(userId);
        const newBalance = currentBalance + amount;

        const [entry] = await this.db
            .insert(schema.pointBalance)
            .values({
                userId,
                transactionType: 'credit',
                amount,
                balanceAfter: newBalance,
                description,
                referenceId,
            })
            .returning();

        return entry;
    }

    async deductPoints(userId: string, amount: number, description: string, referenceId?: string) {
        const currentBalance = await this.getPointBalance(userId);

        if (currentBalance < amount) {
            throw new BadRequestException('Insufficient points');
        }

        const newBalance = currentBalance - amount;

        const [entry] = await this.db
            .insert(schema.pointBalance)
            .values({
                userId,
                transactionType: 'debit',
                amount: -amount,
                balanceAfter: newBalance,
                description,
                referenceId,
            })
            .returning();

        return entry;
    }

    async getRedemptions(userId: string) {
        const redemptions = await this.db
            .select({
                id: schema.redemptions.id,
                quantity: schema.redemptions.quantity,
                pointsSpent: schema.redemptions.pointsSpent,
                status: schema.redemptions.status,
                createdAt: schema.redemptions.createdAt,
                giftId: schema.gifts.id,
                giftName: schema.gifts.name,
                giftImageUrl: schema.gifts.imageUrl,
                giftPointsRequired: schema.gifts.pointsRequired,
            })
            .from(schema.redemptions)
            .leftJoin(schema.gifts, eq(schema.redemptions.giftId, schema.gifts.id))
            .where(eq(schema.redemptions.userId, userId))
            .orderBy(desc(schema.redemptions.createdAt));

        const redemptionIds = redemptions.map((r: any) => r.id);

        let ratingsMap: Map<string, any> = new Map();
        if (redemptionIds.length > 0) {
            const ratings = await this.db
                .select({
                    redemptionId: schema.ratings.redemptionId,
                    stars: schema.ratings.stars,
                    review: schema.ratings.review,
                })
                .from(schema.ratings)
                .where(eq(schema.ratings.userId, userId));

            ratings.forEach((r: any) => ratingsMap.set(r.redemptionId, r));
        }

        return {
            data: redemptions.map((r: any) => ({
                ...r,
                hasRating: ratingsMap.has(r.id),
                rating: ratingsMap.get(r.id) || null,
            })),
        };
    }
}

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { DRIZZLE } from '../database/database.module';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

describe('UsersService', () => {
    let service: UsersService;
    let mockDb: any;

    let limitReturnValues: any[] = [];
    let limitCallIndex = 0;
    let orderByReturnValues: any[] = [];
    let orderByCallIndex = 0;

    const createMockDb = () => {
        const db: any = {};
        db.select = jest.fn().mockReturnValue(db);
        db.from = jest.fn().mockReturnValue(db);
        db.where = jest.fn().mockReturnValue(db);
        db.leftJoin = jest.fn().mockReturnValue(db);
        db.orderBy = jest.fn().mockImplementation(() => {
            if (orderByCallIndex < orderByReturnValues.length) {
                const value = orderByReturnValues[orderByCallIndex];
                orderByCallIndex++;
                return Promise.resolve(value);
            }
            return db;
        });
        db.limit = jest.fn().mockImplementation(() => {
            const value = limitReturnValues[limitCallIndex] ?? [];
            limitCallIndex++;
            return Promise.resolve(value);
        });
        db.insert = jest.fn().mockReturnValue(db);
        db.values = jest.fn().mockReturnValue(db);
        db.returning = jest.fn().mockResolvedValue([]);
        db.update = jest.fn().mockReturnValue(db);
        db.set = jest.fn().mockReturnValue(db);
        return db;
    };

    beforeEach(async () => {
        limitReturnValues = [];
        limitCallIndex = 0;
        orderByReturnValues = [];
        orderByCallIndex = 0;
        mockDb = createMockDb();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: DRIZZLE, useValue: mockDb },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getProfile', () => {
        it('should throw NotFoundException if user is not found', async () => {
            limitReturnValues = [[]];

            await expect(service.getProfile('invalid-id')).rejects.toThrow(NotFoundException);
        });

        it('should return user profile with point balance', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test User',
                phone: '1234567890',
                avatarUrl: null,
                isVerified: true,
                createdAt: new Date(),
                role: 'user',
            };

            limitReturnValues = [[mockUser], [{ balanceAfter: 1500 }]];

            const result = await service.getProfile('user-1');

            expect(result).toHaveProperty('id', 'user-1');
            expect(result).toHaveProperty('email', 'test@test.com');
            expect(result).toHaveProperty('pointBalance', 1500);
        });

        it('should return 0 point balance if no balance record exists', async () => {
            const mockUser = {
                id: 'user-1',
                email: 'test@test.com',
                name: 'Test User',
                role: 'user',
            };

            limitReturnValues = [[mockUser], []];

            const result = await service.getProfile('user-1');

            expect(result).toHaveProperty('pointBalance', 0);
        });
    });

    describe('updateProfile', () => {
        it('should throw NotFoundException if user is not found', async () => {
            limitReturnValues = [[]];

            await expect(
                service.updateProfile('invalid-id', { name: 'New Name' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should update and return user profile', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com', name: 'Old Name' };
            const updatedUser = {
                id: 'user-1',
                email: 'test@test.com',
                name: 'New Name',
                phone: '9876543210',
                avatarUrl: 'https://avatar.com/new.jpg',
            };

            limitReturnValues = [[mockUser]];
            mockDb.returning.mockResolvedValue([updatedUser]);

            const result = await service.updateProfile('user-1', { name: 'New Name', phone: '9876543210' });

            expect(result).toHaveProperty('name', 'New Name');
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('changePassword', () => {
        it('should throw NotFoundException if user is not found', async () => {
            limitReturnValues = [[]];

            await expect(
                service.changePassword('invalid-id', { currentPassword: 'old', newPassword: 'new' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if user has no password (Google user)', async () => {
            const mockUser = { id: 'user-1', passwordHash: null };
            limitReturnValues = [[mockUser]];

            await expect(
                service.changePassword('user-1', { currentPassword: 'old', newPassword: 'new' }),
            ).rejects.toThrow('No password set for this account');
        });

        it('should throw BadRequestException if current password is incorrect', async () => {
            const mockUser = { id: 'user-1', passwordHash: 'hashed-password' };
            limitReturnValues = [[mockUser]];
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'new' }),
            ).rejects.toThrow('Current password is incorrect');
        });

        it('should change password successfully', async () => {
            const mockUser = { id: 'user-1', passwordHash: 'old-hashed' };
            limitReturnValues = [[mockUser]];
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);
            (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed');

            const result = await service.changePassword('user-1', { currentPassword: 'old', newPassword: 'new' });

            expect(result).toHaveProperty('message', 'Password changed successfully');
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('getPointBalance', () => {
        it('should return 0 if no balance found', async () => {
            limitReturnValues = [[]];
            const balance = await service.getPointBalance('user-1');
            expect(balance).toBe(0);
        });

        it('should return the latest balance', async () => {
            limitReturnValues = [[{ balanceAfter: 1500 }]];
            const balance = await service.getPointBalance('user-1');
            expect(balance).toBe(1500);
        });
    });

    describe('getPointHistory', () => {
        it('should return empty array if no history', async () => {
            limitReturnValues = [[]];
            const history = await service.getPointHistory('user-1');
            expect(history).toEqual([]);
        });

        it('should return point history with default limit', async () => {
            const mockHistory = [
                { id: '1', amount: 500, balanceAfter: 1500, transactionType: 'credit' },
                { id: '2', amount: -100, balanceAfter: 1400, transactionType: 'debit' },
            ];
            limitReturnValues = [mockHistory];

            const history = await service.getPointHistory('user-1');
            expect(history).toHaveLength(2);
        });

        it('should respect custom limit', async () => {
            limitReturnValues = [[{ id: '1' }]];

            await service.getPointHistory('user-1', 5);
            expect(mockDb.limit).toHaveBeenCalledWith(5);
        });
    });

    describe('addPoints', () => {
        it('should create a credit transaction with new balance', async () => {
            limitReturnValues = [[{ balanceAfter: 1000 }]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: 500, balanceAfter: 1500, transactionType: 'credit' }]);

            const result = await service.addPoints('user-1', 500, 'Test credit');

            expect(result.balanceAfter).toBe(1500);
            expect(result.transactionType).toBe('credit');
            expect(mockDb.insert).toHaveBeenCalled();
        });

        it('should add points with reference ID', async () => {
            limitReturnValues = [[{ balanceAfter: 0 }]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: 1000, balanceAfter: 1000, referenceId: 'ref-1' }]);

            const result = await service.addPoints('user-1', 1000, 'Welcome bonus', 'ref-1');

            expect(result.referenceId).toBe('ref-1');
        });

        it('should handle zero balance start', async () => {
            limitReturnValues = [[]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: 500, balanceAfter: 500 }]);

            const result = await service.addPoints('user-1', 500, 'First credit');

            expect(result.balanceAfter).toBe(500);
        });
    });

    describe('deductPoints', () => {
        it('should throw BadRequestException if insufficient points', async () => {
            limitReturnValues = [[{ balanceAfter: 100 }]];

            await expect(
                service.deductPoints('user-1', 500, 'Test debit'),
            ).rejects.toThrow('Insufficient points');
        });

        it('should create a debit transaction', async () => {
            limitReturnValues = [[{ balanceAfter: 1000 }]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: -300, balanceAfter: 700, transactionType: 'debit' }]);

            const result = await service.deductPoints('user-1', 300, 'Gift redemption');

            expect(result.balanceAfter).toBe(700);
            expect(result.amount).toBe(-300);
        });

        it('should deduct points with reference ID', async () => {
            limitReturnValues = [[{ balanceAfter: 500 }]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: -100, balanceAfter: 400, referenceId: 'redemption-1' }]);

            const result = await service.deductPoints('user-1', 100, 'Redemption', 'redemption-1');

            expect(result.referenceId).toBe('redemption-1');
        });

        it('should allow exact balance deduction', async () => {
            limitReturnValues = [[{ balanceAfter: 500 }]];
            mockDb.returning.mockResolvedValue([{ id: '1', amount: -500, balanceAfter: 0 }]);

            const result = await service.deductPoints('user-1', 500, 'Full deduction');

            expect(result.balanceAfter).toBe(0);
        });
    });

    describe('getRedemptions', () => {
        it('should return empty data if no redemptions', async () => {
            orderByReturnValues = [[]];

            const result = await service.getRedemptions('user-1');

            expect(result.data).toEqual([]);
        });

        it('should return redemptions with ratings', async () => {
            const mockRedemptions = [
                { id: 'r1', giftId: 'g1', giftName: 'Gift 1', quantity: 1, pointsSpent: 100, status: 'completed' },
                { id: 'r2', giftId: 'g2', giftName: 'Gift 2', quantity: 2, pointsSpent: 400, status: 'completed' },
            ];
            const mockRatings = [
                { redemptionId: 'r1', stars: 5, review: 'Great!' },
            ];

            orderByReturnValues = [mockRedemptions];

            let whereCallCount = 0;
            mockDb.where = jest.fn().mockImplementation(() => {
                whereCallCount++;
                if (whereCallCount === 2) {
                    return Promise.resolve(mockRatings);
                }
                return mockDb;
            });

            const result = await service.getRedemptions('user-1');

            expect(result.data).toHaveLength(2);
            expect(result.data[0]).toHaveProperty('hasRating', true);
            expect(result.data[1]).toHaveProperty('hasRating', false);
        });

        it('should include rating details for rated redemptions', async () => {
            const mockRedemptions = [
                { id: 'r1', giftId: 'g1', giftName: 'Gift 1', quantity: 1, pointsSpent: 100 },
            ];
            const mockRatings = [
                { redemptionId: 'r1', stars: 4, review: 'Good product' },
            ];

            orderByReturnValues = [mockRedemptions];

            let whereCallCount = 0;
            mockDb.where = jest.fn().mockImplementation(() => {
                whereCallCount++;
                if (whereCallCount === 2) {
                    return Promise.resolve(mockRatings);
                }
                return mockDb;
            });

            const result = await service.getRedemptions('user-1');

            expect(result.data[0].rating).toHaveProperty('stars', 4);
            expect(result.data[0].rating).toHaveProperty('review', 'Good product');
        });
    });
});

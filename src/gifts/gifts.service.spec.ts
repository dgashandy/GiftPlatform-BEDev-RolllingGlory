import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GiftsService } from './gifts.service';
import { UsersService } from '../users/users.service';
import { DRIZZLE } from '../database/database.module';

describe('GiftsService', () => {
    let service: GiftsService;
    let mockDb: any;
    let mockUsersService: any;

    let limitReturnValues: any[] = [];
    let limitCallIndex = 0;

    const createMockDb = () => {
        const db: any = {};
        db.select = jest.fn().mockReturnValue(db);
        db.from = jest.fn().mockReturnValue(db);
        db.where = jest.fn().mockReturnValue(db);
        db.leftJoin = jest.fn().mockReturnValue(db);
        db.orderBy = jest.fn().mockReturnValue(db);
        db.limit = jest.fn().mockImplementation(() => {
            const value = limitReturnValues[limitCallIndex] ?? [];
            limitCallIndex++;
            const result = Promise.resolve(value);
            Object.assign(result, db);
            return result;
        });
        db.offset = jest.fn().mockResolvedValue([]);
        db.insert = jest.fn().mockReturnValue(db);
        db.values = jest.fn().mockReturnValue(db);
        db.returning = jest.fn().mockResolvedValue([]);
        db.update = jest.fn().mockReturnValue(db);
        db.set = jest.fn().mockReturnValue(db);
        db.delete = jest.fn().mockReturnValue(db);
        return db;
    };

    beforeEach(async () => {
        limitReturnValues = [];
        limitCallIndex = 0;
        mockDb = createMockDb();

        mockUsersService = {
            getPointBalance: jest.fn().mockResolvedValue(10000),
            deductPoints: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GiftsService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: UsersService, useValue: mockUsersService },
            ],
        }).compile();

        service = module.get<GiftsService>(GiftsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateStarRating', () => {
        it('should round 3.2 to 3.0', () => {
            expect(service['calculateStarRating'](3.2)).toBe(3.0);
        });

        it('should round 3.6 to 3.5', () => {
            expect(service['calculateStarRating'](3.6)).toBe(3.5);
        });

        it('should round 3.9 to 4.0', () => {
            expect(service['calculateStarRating'](3.9)).toBe(4.0);
        });

        it('should round 4.5 to 4.5', () => {
            expect(service['calculateStarRating'](4.5)).toBe(4.5);
        });

        it('should handle string input', () => {
            expect(service['calculateStarRating']('4.3')).toBe(4.5);
        });

        it('should handle zero rating', () => {
            expect(service['calculateStarRating'](0)).toBe(0);
        });
    });

    describe('findAll', () => {
        it('should return paginated results with default parameters', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 5 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);

            mockDb.offset.mockResolvedValue([
                { id: '1', name: 'Gift 1', avgRating: '4.5', stock: 10 },
            ]);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
            expect(result.meta).toHaveProperty('total', 5);
        });

        it('should apply category filter', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 2 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 10, categoryId: 'cat-1' });

            expect(mockDb.where).toHaveBeenCalled();
        });

        it('should apply search filter', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 1 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([
                { id: '1', name: 'Test Gift', avgRating: '4.0', stock: 5 },
            ]);

            const result = await service.findAll({ page: 1, limit: 10, search: 'Test' });

            expect(result.data).toHaveLength(1);
        });

        it('should apply minimum rating filter', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 3 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 10, minRating: 4 });

            expect(mockDb.where).toHaveBeenCalled();
        });

        it('should sort by rating', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 2 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 10, sortBy: 'rating', order: 'DESC' });

            expect(mockDb.orderBy).toHaveBeenCalled();
        });

        it('should sort by pointsRequired', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 2 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 10, sortBy: 'pointsRequired', order: 'ASC' });

            expect(mockDb.orderBy).toHaveBeenCalled();
        });

        it('should sort by name', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 2 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([]);

            await service.findAll({ page: 1, limit: 10, sortBy: 'name' });

            expect(mockDb.orderBy).toHaveBeenCalled();
        });

        it('should include inStock field based on stock', async () => {
            const countMock = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 2 }]),
            };
            mockDb.select.mockReturnValueOnce(countMock);
            mockDb.offset.mockResolvedValue([
                { id: '1', name: 'In Stock', avgRating: '4.0', stock: 10 },
                { id: '2', name: 'Out of Stock', avgRating: '3.5', stock: 0 },
            ]);

            const result = await service.findAll({ page: 1, limit: 10 });

            expect(result.data[0]).toHaveProperty('inStock', true);
            expect(result.data[1]).toHaveProperty('inStock', false);
        });
    });

    describe('findOne', () => {
        it('should throw NotFoundException if gift is not found', async () => {
            limitReturnValues = [[]];

            await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
        });

        it('should return gift with recent ratings', async () => {
            const mockGift = {
                id: 'gift-1',
                name: 'Test Gift',
                description: 'A test gift',
                pointsRequired: 500,
                stock: 10,
                avgRating: '4.5',
            };
            const mockRatings = [
                { id: 'r1', stars: 5, review: 'Great!', userName: 'User 1' },
            ];

            limitReturnValues = [[mockGift], mockRatings];

            const result = await service.findOne('gift-1');

            expect(result).toHaveProperty('id', 'gift-1');
            expect(result).toHaveProperty('recentRatings');
            expect(result).toHaveProperty('inStock', true);
            expect(result.avgRating).toBe(4.5);
        });

        it('should mark gift as out of stock when stock is 0', async () => {
            const mockGift = { id: 'gift-1', name: 'Test Gift', stock: 0, avgRating: '4.0' };

            limitReturnValues = [[mockGift], []];

            const result = await service.findOne('gift-1');

            expect(result.inStock).toBe(false);
        });
    });

    describe('create', () => {
        it('should create and return a new gift', async () => {
            const createDto = { name: 'New Gift', description: 'Desc', pointsRequired: 100, stock: 50, categoryId: 'cat-1' };
            const createdGift = { id: 'new-1', ...createDto };

            mockDb.returning.mockResolvedValue([createdGift]);

            const result = await service.create(createDto);

            expect(result).toHaveProperty('id', 'new-1');
            expect(result).toHaveProperty('name', 'New Gift');
            expect(mockDb.insert).toHaveBeenCalled();
        });
    });

    describe('update', () => {
        it('should throw NotFoundException if gift does not exist', async () => {
            limitReturnValues = [[]];

            await expect(
                service.update('invalid-id', { name: 'Updated' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should update and return gift', async () => {
            const existingGift = { id: 'gift-1', name: 'Old Name' };
            const updatedGift = { id: 'gift-1', name: 'New Name', pointsRequired: 200 };

            limitReturnValues = [[existingGift]];
            mockDb.returning.mockResolvedValue([updatedGift]);

            const result = await service.update('gift-1', { name: 'New Name', pointsRequired: 200 });

            expect(result).toHaveProperty('name', 'New Name');
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('should throw NotFoundException if gift does not exist', async () => {
            limitReturnValues = [[]];

            await expect(service.remove('invalid-id')).rejects.toThrow(NotFoundException);
        });

        it('should delete gift and return success message', async () => {
            limitReturnValues = [[{ id: 'gift-1', name: 'Test Gift' }]];

            const result = await service.remove('gift-1');

            expect(result).toHaveProperty('message', 'Gift deleted successfully');
            expect(mockDb.delete).toHaveBeenCalled();
        });
    });

    describe('redeem', () => {
        it('should throw NotFoundException if gift is not found', async () => {
            limitReturnValues = [[]];

            await expect(
                service.redeem('user-1', 'invalid-gift', { quantity: 1 }),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if gift is not active', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Inactive Gift', stock: 10, pointsRequired: 100, isActive: false },
            ]];

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 1 }),
            ).rejects.toThrow('This gift is not available');
        });

        it('should throw BadRequestException if stock is insufficient', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Gift', stock: 0, pointsRequired: 100, isActive: true },
            ]];

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 1 }),
            ).rejects.toThrow('Insufficient stock');
        });

        it('should throw BadRequestException if points are insufficient', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Expensive Gift', stock: 10, pointsRequired: 100000, isActive: true },
            ]];
            mockUsersService.getPointBalance.mockResolvedValue(100);

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 1 }),
            ).rejects.toThrow('Insufficient points');
        });

        it('should throw BadRequestException if race condition occurs (stock depleted)', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Gift', stock: 5, pointsRequired: 100, isActive: true },
            ]];
            mockUsersService.getPointBalance.mockResolvedValue(10000);
            mockDb.returning.mockResolvedValueOnce([]);

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 5 }),
            ).rejects.toThrow('Item no longer in stock');
        });

        it('should successfully redeem a gift', async () => {
            const mockGift = { id: 'gift-1', name: 'Test Gift', stock: 10, pointsRequired: 100, isActive: true };
            const mockRedemption = { id: 'redemption-1', userId: 'user-1', giftId: 'gift-1', quantity: 2, pointsSpent: 200 };

            limitReturnValues = [[mockGift]];
            mockUsersService.getPointBalance.mockResolvedValue(10000);
            mockDb.returning
                .mockResolvedValueOnce([{ ...mockGift, stock: 8 }])
                .mockResolvedValueOnce([mockRedemption]);

            const result = await service.redeem('user-1', 'gift-1', { quantity: 2 });

            expect(result).toHaveProperty('redemption');
            expect(result).toHaveProperty('pointsSpent', 200);
            expect(mockUsersService.deductPoints).toHaveBeenCalledWith('user-1', 200, expect.any(String), 'redemption-1');
        });
    });

    describe('redeemMultiple', () => {
        it('should throw NotFoundException if any gift is not found', async () => {
            limitReturnValues = [[]];

            await expect(
                service.redeemMultiple('user-1', [{ giftId: 'invalid', quantity: 1 }]),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException if any gift is not active', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Inactive Gift', stock: 10, pointsRequired: 100, isActive: false },
            ]];

            await expect(
                service.redeemMultiple('user-1', [{ giftId: 'gift-1', quantity: 1 }]),
            ).rejects.toThrow('is not available');
        });

        it('should throw BadRequestException if any gift has insufficient stock', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Gift', stock: 2, pointsRequired: 100, isActive: true },
            ]];

            await expect(
                service.redeemMultiple('user-1', [{ giftId: 'gift-1', quantity: 5 }]),
            ).rejects.toThrow('Insufficient stock');
        });

        it('should throw BadRequestException if total points exceed balance', async () => {
            limitReturnValues = [[
                { id: 'gift-1', name: 'Gift', stock: 10, pointsRequired: 10000, isActive: true },
            ]];
            mockUsersService.getPointBalance.mockResolvedValue(100);

            await expect(
                service.redeemMultiple('user-1', [{ giftId: 'gift-1', quantity: 2 }]),
            ).rejects.toThrow('Insufficient points');
        });

        it('should successfully redeem multiple gifts', async () => {
            const mockGift1 = { id: 'gift-1', name: 'Gift 1', stock: 10, pointsRequired: 100, isActive: true };
            const mockGift2 = { id: 'gift-2', name: 'Gift 2', stock: 5, pointsRequired: 200, isActive: true };

            limitReturnValues = [[mockGift1], [mockGift2]];
            mockUsersService.getPointBalance.mockResolvedValue(10000);
            mockDb.returning
                .mockResolvedValueOnce([{ ...mockGift1, stock: 9 }])
                .mockResolvedValueOnce([{ id: 'r1' }])
                .mockResolvedValueOnce([{ ...mockGift2, stock: 4 }])
                .mockResolvedValueOnce([{ id: 'r2' }]);

            const result = await service.redeemMultiple('user-1', [
                { giftId: 'gift-1', quantity: 1 },
                { giftId: 'gift-2', quantity: 1 },
            ]);

            expect(result).toHaveProperty('redemptions');
            expect(result.redemptions).toHaveLength(2);
            expect(result).toHaveProperty('totalPointsSpent', 300);
        });
    });

    describe('addRating', () => {
        it('should throw BadRequestException if user has not redeemed the gift', async () => {
            limitReturnValues = [[]];

            await expect(
                service.addRating('user-1', 'gift-1', { redemptionId: 'r1', stars: 5 }),
            ).rejects.toThrow('You can only rate gifts you have redeemed');
        });

        it('should throw BadRequestException if already rated', async () => {
            const mockRedemption = { id: 'r1', userId: 'user-1', giftId: 'gift-1' };
            const mockExistingRating = { id: 'rating-1', redemptionId: 'r1' };

            limitReturnValues = [[mockRedemption], [mockExistingRating]];

            await expect(
                service.addRating('user-1', 'gift-1', { redemptionId: 'r1', stars: 5 }),
            ).rejects.toThrow('You have already rated this redemption');
        });

        it('should add rating and update gift stats', async () => {
            const mockRedemption = { id: 'r1', userId: 'user-1', giftId: 'gift-1' };
            const mockRating = { id: 'rating-1', stars: 5, review: 'Great!' };
            const mockGift = { avgRating: '4.0', totalReviews: 10 };

            limitReturnValues = [[mockRedemption], [], [mockGift]];

            mockDb.returning.mockResolvedValue([mockRating]);

            let whereCallCount = 0;
            mockDb.where = jest.fn().mockImplementation(() => {
                whereCallCount++;
                if (whereCallCount === 4) {
                    return Promise.resolve([{ avgRating: '4.5', totalReviews: 1 }]);
                }
                return mockDb;
            });

            const result = await service.addRating('user-1', 'gift-1', { redemptionId: 'r1', stars: 5, review: 'Great!' });

            expect(result).toHaveProperty('stars', 5);
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('getCategories', () => {
        it('should return active categories sorted by name', async () => {
            const mockCategories = [
                { id: 'cat-1', name: 'Electronics', isActive: true },
                { id: 'cat-2', name: 'Fashion', isActive: true },
            ];

            mockDb.orderBy.mockResolvedValue(mockCategories);

            const result = await service.getCategories();

            expect(result).toHaveLength(2);
            expect(mockDb.where).toHaveBeenCalled();
            expect(mockDb.orderBy).toHaveBeenCalled();
        });

        it('should return empty array if no categories', async () => {
            mockDb.orderBy.mockResolvedValue([]);

            const result = await service.getCategories();

            expect(result).toEqual([]);
        });
    });
});

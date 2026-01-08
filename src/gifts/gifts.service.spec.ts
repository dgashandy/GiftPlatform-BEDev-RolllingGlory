import { Test, TestingModule } from '@nestjs/testing';
import { GiftsService } from './gifts.service';
import { UsersService } from '../users/users.service';
import { DRIZZLE } from '../database/database.module';

describe('GiftsService', () => {
    let service: GiftsService;
    let mockDb: any;
    let mockUsersService: any;

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockResolvedValue([]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
        };

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
    });

    describe('findAll', () => {
        it('should return paginated results', async () => {
            mockDb.select.mockReturnValueOnce({
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([{ total: 5 }]),
            });
            mockDb.offset.mockResolvedValue([
                { id: '1', name: 'Gift 1', avgRating: '4.5', stock: 10 },
            ]);

            const result = await service.findAll({ page: 1, limit: 10 });
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('meta');
        });
    });

    describe('redeem', () => {
        it('should throw BadRequestException if stock is insufficient', async () => {
            mockDb.limit.mockResolvedValue([
                { id: '1', name: 'Gift', stock: 0, pointsRequired: 100, isActive: true },
            ]);

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 1 }),
            ).rejects.toThrow('Insufficient stock');
        });

        it('should throw BadRequestException if points are insufficient', async () => {
            mockDb.limit.mockResolvedValue([
                { id: '1', name: 'Gift', stock: 10, pointsRequired: 100000, isActive: true },
            ]);
            mockUsersService.getPointBalance.mockResolvedValue(100);

            await expect(
                service.redeem('user-1', 'gift-1', { quantity: 1 }),
            ).rejects.toThrow('Insufficient points');
        });
    });
});

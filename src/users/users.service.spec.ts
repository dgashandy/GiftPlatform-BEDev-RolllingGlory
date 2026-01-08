import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DRIZZLE } from '../database/database.module';

describe('UsersService', () => {
    let service: UsersService;
    let mockDb: any;

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: DRIZZLE, useValue: mockDb },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getPointBalance', () => {
        it('should return 0 if no balance found', async () => {
            mockDb.limit.mockResolvedValue([]);
            const balance = await service.getPointBalance('user-1');
            expect(balance).toBe(0);
        });

        it('should return the latest balance', async () => {
            mockDb.limit.mockResolvedValue([{ balanceAfter: 1500 }]);
            const balance = await service.getPointBalance('user-1');
            expect(balance).toBe(1500);
        });
    });

    describe('addPoints', () => {
        it('should create a credit transaction', async () => {
            mockDb.limit.mockResolvedValue([{ balanceAfter: 1000 }]);
            mockDb.returning.mockResolvedValue([{ id: '1', amount: 500, balanceAfter: 1500 }]);

            const result = await service.addPoints('user-1', 500, 'Test credit');
            expect(result.balanceAfter).toBe(1500);
        });
    });

    describe('deductPoints', () => {
        it('should throw BadRequestException if insufficient points', async () => {
            mockDb.limit.mockResolvedValue([{ balanceAfter: 100 }]);

            await expect(
                service.deductPoints('user-1', 500, 'Test debit'),
            ).rejects.toThrow('Insufficient points');
        });
    });
});

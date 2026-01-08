import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { DRIZZLE } from '../database/database.module';

describe('AuthService', () => {
    let service: AuthService;
    let mockDb: any;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '15m',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_REFRESH_EXPIRES_IN: '7d',
                MAIL_HOST: 'smtp.test.com',
                MAIL_PORT: '587',
                MAIL_USER: 'test@test.com',
                MAIL_PASSWORD: 'password',
                MAIL_FROM: 'test@test.com',
            };
            return config[key];
        }),
    };

    const mockJwtService = {
        signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    beforeEach(async () => {
        mockDb = {
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: DRIZZLE, useValue: mockDb },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('should throw UnauthorizedException for invalid credentials', async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                service.login({ email: 'test@test.com', password: 'wrong' }),
            ).rejects.toThrow('Invalid credentials');
        });
    });

    describe('register', () => {
        it('should throw ConflictException if email already exists', async () => {
            mockDb.limit.mockResolvedValue([{ id: '1', email: 'test@test.com' }]);

            await expect(
                service.register({ email: 'test@test.com', password: 'password', name: 'Test' }),
            ).rejects.toThrow('Email already registered');
        });
    });
});

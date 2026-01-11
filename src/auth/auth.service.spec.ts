import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { DRIZZLE } from '../database/database.module';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt', () => ({
    compare: jest.fn(),
    hash: jest.fn(),
}));

const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
        sendMail: (...args: any[]) => mockSendMail(...args),
    })),
}));

describe('AuthService', () => {
    let service: AuthService;
    let mockDb: any;
    let mockJwtService: any;

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

    const createMockDb = () => {
        const db: any = {};
        db.select = jest.fn().mockReturnValue(db);
        db.from = jest.fn().mockReturnValue(db);
        db.where = jest.fn().mockReturnValue(db);
        db.limit = jest.fn().mockResolvedValue([]);
        db.insert = jest.fn().mockReturnValue(db);
        db.values = jest.fn().mockReturnValue(db);
        db.returning = jest.fn().mockResolvedValue([]);
        db.update = jest.fn().mockReturnValue(db);
        db.set = jest.fn().mockReturnValue(db);
        db.delete = jest.fn().mockReturnValue(db);
        return db;
    };

    beforeEach(async () => {
        mockDb = createMockDb();
        mockSendMail.mockResolvedValue({});

        mockJwtService = {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
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

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('login', () => {
        it('should throw UnauthorizedException when user is not found', async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                service.login({ email: 'test@test.com', password: 'wrong' }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException when user has no password (Google user)', async () => {
            mockDb.limit.mockResolvedValue([{ id: '1', email: 'test@test.com', passwordHash: null }]);

            await expect(
                service.login({ email: 'test@test.com', password: 'password' }),
            ).rejects.toThrow('Please login with Google or set a password');
        });

        it('should throw UnauthorizedException for invalid password', async () => {
            mockDb.limit.mockResolvedValue([{ id: '1', email: 'test@test.com', passwordHash: 'hashed', roleId: 'role-1' }]);
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            await expect(
                service.login({ email: 'test@test.com', password: 'wrong' }),
            ).rejects.toThrow('Invalid credentials');
        });

        it('should return tokens and user on successful login', async () => {
            const mockUser = { id: '1', email: 'test@test.com', name: 'Test', passwordHash: 'hashed', roleId: 'role-1' };
            const mockRole = { id: 'role-1', name: 'user' };

            mockDb.limit
                .mockResolvedValueOnce([mockUser])
                .mockResolvedValueOnce([mockRole]);

            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const result = await service.login({ email: 'test@test.com', password: 'password' });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user).toHaveProperty('id', '1');
            expect(result.user).toHaveProperty('email', 'test@test.com');
        });
    });

    describe('register', () => {
        it('should throw ConflictException if email already exists', async () => {
            mockDb.limit.mockResolvedValue([{ id: '1', email: 'test@test.com' }]);

            await expect(
                service.register({ email: 'test@test.com', password: 'password', name: 'Test' }),
            ).rejects.toThrow(ConflictException);
        });

        it('should throw BadRequestException if user role not found', async () => {
            mockDb.limit
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            await expect(
                service.register({ email: 'test@test.com', password: 'password', name: 'Test' }),
            ).rejects.toThrow('System not configured properly');
        });

        it('should register new user and return success message', async () => {
            const mockRole = { id: 'role-1', name: 'user' };
            const mockNewUser = { id: 'user-1', email: 'test@test.com', name: 'Test' };

            mockDb.limit
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockRole]);

            mockDb.returning.mockResolvedValue([mockNewUser]);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

            const result = await service.register({ email: 'test@test.com', password: 'password', name: 'Test' });

            expect(result).toHaveProperty('message');
            expect(result).toHaveProperty('email', 'test@test.com');
            expect(result).toHaveProperty('requiresVerification', true);
        });

        it('should rollback on email send failure', async () => {
            const mockRole = { id: 'role-1', name: 'user' };
            const mockNewUser = { id: 'user-1', email: 'invalid@test.com', name: 'Test' };

            mockDb.limit
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockRole]);

            mockDb.returning.mockResolvedValue([mockNewUser]);
            (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
            mockSendMail.mockRejectedValueOnce(new Error('Email failed'));

            await expect(
                service.register({ email: 'invalid@test.com', password: 'password', name: 'Test' }),
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('handleGoogleLogin', () => {
        it('should return existing user with tokens if found by googleId', async () => {
            const mockUser = { id: '1', email: 'test@test.com', name: 'Test', googleId: 'google-123', roleId: 'role-1' };
            const mockRole = { id: 'role-1', name: 'user' };

            mockDb.limit
                .mockResolvedValueOnce([mockUser])
                .mockResolvedValueOnce([mockRole]);

            const result = await service.handleGoogleLogin({
                googleId: 'google-123',
                email: 'test@test.com',
                name: 'Test',
                avatarUrl: 'https://avatar.com/test.jpg',
            });

            expect(result.user).toHaveProperty('id', '1');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should link Google account to existing email user', async () => {
            const mockUser = { id: '1', email: 'test@test.com', name: 'Test', googleId: null, roleId: 'role-1' };
            const mockRole = { id: 'role-1', name: 'user' };

            mockDb.limit
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockUser])
                .mockResolvedValueOnce([mockRole]);

            const result = await service.handleGoogleLogin({
                googleId: 'google-123',
                email: 'test@test.com',
                name: 'Test',
                avatarUrl: 'https://avatar.com/test.jpg',
            });

            expect(result.user).toHaveProperty('id', '1');
            expect(mockDb.update).toHaveBeenCalled();
        });

        it('should create new user if not found', async () => {
            const mockRole = { id: 'role-1', name: 'user' };
            const mockNewUser = { id: 'new-1', email: 'new@test.com', name: 'New User', googleId: 'google-new', roleId: 'role-1' };

            mockDb.limit
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([mockRole])
                .mockResolvedValueOnce([mockRole]);

            mockDb.returning.mockResolvedValue([mockNewUser]);

            const result = await service.handleGoogleLogin({
                googleId: 'google-new',
                email: 'new@test.com',
                name: 'New User',
                avatarUrl: 'https://avatar.com/new.jpg',
            });

            expect(result.user).toHaveProperty('isNewUser', true);
            expect(result.user).toHaveProperty('bonusPoints', 1000);
        });
    });

    describe('requestOtp', () => {
        it('should throw BadRequestException if email not found', async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                service.requestOtp({ email: 'notfound@test.com' }),
            ).rejects.toThrow('Email not found');
        });

        it('should send OTP email and return success message', async () => {
            const mockUser = { id: '1', email: 'test@test.com' };
            mockDb.limit.mockResolvedValue([mockUser]);

            const result = await service.requestOtp({ email: 'test@test.com' });

            expect(result).toHaveProperty('message', 'OTP sent to your email');
            expect(mockDb.update).toHaveBeenCalled();
        });
    });

    describe('verifyOtp', () => {
        it('should throw BadRequestException if user not found', async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                service.verifyOtp({ email: 'test@test.com', otp: '123456' }),
            ).rejects.toThrow('Invalid OTP');
        });

        it('should throw BadRequestException if OTP is invalid', async () => {
            const mockUser = { id: '1', email: 'test@test.com', otpCode: '654321', otpExpiresAt: new Date(Date.now() + 60000) };
            mockDb.limit.mockResolvedValue([mockUser]);

            await expect(
                service.verifyOtp({ email: 'test@test.com', otp: '123456' }),
            ).rejects.toThrow('Invalid OTP');
        });

        it('should throw BadRequestException if OTP is expired', async () => {
            const mockUser = { id: '1', email: 'test@test.com', otpCode: '123456', otpExpiresAt: new Date(Date.now() - 60000) };
            mockDb.limit.mockResolvedValue([mockUser]);

            await expect(
                service.verifyOtp({ email: 'test@test.com', otp: '123456' }),
            ).rejects.toThrow('OTP expired');
        });

        it('should verify OTP and return tokens', async () => {
            const mockUser = { id: '1', email: 'test@test.com', name: 'Test', otpCode: '123456', otpExpiresAt: new Date(Date.now() + 60000), roleId: 'role-1' };
            const mockRole = { id: 'role-1', name: 'user' };

            mockDb.limit
                .mockResolvedValueOnce([mockUser])
                .mockResolvedValueOnce([mockRole]);

            const result = await service.verifyOtp({ email: 'test@test.com', otp: '123456' });

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user).toHaveProperty('id', '1');
        });
    });

    describe('refreshTokens', () => {
        it('should throw UnauthorizedException if user not found', async () => {
            mockDb.limit.mockResolvedValue([]);

            await expect(
                service.refreshTokens('user-1', 'refresh-token'),
            ).rejects.toThrow('Invalid refresh token');
        });

        it('should throw UnauthorizedException if refresh token does not match', async () => {
            const mockUser = { id: '1', refreshToken: 'different-token', roleId: 'role-1' };
            mockDb.limit.mockResolvedValue([mockUser]);

            await expect(
                service.refreshTokens('1', 'refresh-token'),
            ).rejects.toThrow('Invalid refresh token');
        });

        it('should return new tokens on valid refresh', async () => {
            const mockUser = { id: '1', email: 'test@test.com', refreshToken: 'valid-token', roleId: 'role-1' };
            const mockRole = { id: 'role-1', name: 'user' };

            mockDb.limit
                .mockResolvedValueOnce([mockUser])
                .mockResolvedValueOnce([mockRole]);

            const result = await service.refreshTokens('1', 'valid-token');

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });
    });

    describe('logout', () => {
        it('should clear refresh token and return success message', async () => {
            const result = await service.logout('user-1');

            expect(result).toHaveProperty('message', 'Logged out successfully');
            expect(mockDb.update).toHaveBeenCalled();
        });
    });
});

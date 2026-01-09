import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    Inject,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { LoginDto, RegisterDto, OtpDto, RequestOtpDto } from './dto';

@Injectable()
export class AuthService {
    private transporter: nodemailer.Transporter;

    constructor(
        @Inject(DRIZZLE) private db: any,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get('MAIL_HOST'),
            port: this.configService.get('MAIL_PORT'),
            secure: false,
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASSWORD'),
            },
        });
    }

    async login(loginDto: LoginDto) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, loginDto.email))
            .limit(1);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.passwordHash) {
            throw new UnauthorizedException('Please login with Google or set a password');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const [role] = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.id, user.roleId))
            .limit(1);

        const tokens = await this.generateTokens(user.id, user.email, user.roleId, role?.name || 'user');

        await this.db
            .update(schema.users)
            .set({ refreshToken: tokens.refreshToken })
            .where(eq(schema.users.id, user.id));

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: role?.name,
            },
            ...tokens,
        };
    }

    async register(registerDto: RegisterDto) {
        const [existingUser] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, registerDto.email))
            .limit(1);

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const [userRole] = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.name, 'user'))
            .limit(1);

        if (!userRole) {
            throw new BadRequestException('System not configured properly');
        }

        const passwordHash = await bcrypt.hash(registerDto.password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const [newUser] = await this.db
            .insert(schema.users)
            .values({
                email: registerDto.email,
                passwordHash,
                name: registerDto.name,
                phone: registerDto.phone,
                roleId: userRole.id,
                isVerified: false,
                otpCode: otp,
                otpExpiresAt,
            })
            .returning();

        await this.db.insert(schema.pointBalance).values({
            userId: newUser.id,
            transactionType: 'credit',
            amount: 1000,
            balanceAfter: 1000,
            description: 'Welcome bonus - New user registration',
        });

        try {
            await this.transporter.sendMail({
                from: this.configService.get('MAIL_FROM'),
                to: newUser.email,
                subject: 'Verify Your Email - Gift Platform',
                html: `
                    <h1>Welcome to Gift Platform!</h1>
                    <p>Thank you for registering. Please verify your email with this OTP code:</p>
                    <h2 style="font-size: 32px; letter-spacing: 5px; color: #6366f1;">${otp}</h2>
                    <p>This code expires in 10 minutes.</p>
                    <p>You'll receive <strong>1000 bonus points</strong> once verified!</p>
                `,
            });
        } catch (emailError) {
            await this.db.delete(schema.pointBalance).where(eq(schema.pointBalance.userId, newUser.id));
            await this.db.delete(schema.users).where(eq(schema.users.id, newUser.id));
            throw new BadRequestException('Failed to send verification email. Please check your email address and try again.');
        }

        return {
            message: 'Registration successful. Please check your email for OTP verification.',
            email: newUser.email,
            requiresVerification: true,
        };
    }

    async handleGoogleLogin(googleUser: any) {
        let [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.googleId, googleUser.googleId))
            .limit(1);

        let isNewUser = false;

        if (!user) {
            [user] = await this.db
                .select()
                .from(schema.users)
                .where(eq(schema.users.email, googleUser.email))
                .limit(1);

            if (user) {
                await this.db
                    .update(schema.users)
                    .set({ googleId: googleUser.googleId, avatarUrl: googleUser.avatarUrl })
                    .where(eq(schema.users.id, user.id));
            } else {
                const [userRole] = await this.db
                    .select()
                    .from(schema.roles)
                    .where(eq(schema.roles.name, 'user'))
                    .limit(1);

                [user] = await this.db
                    .insert(schema.users)
                    .values({
                        email: googleUser.email,
                        name: googleUser.name,
                        avatarUrl: googleUser.avatarUrl,
                        googleId: googleUser.googleId,
                        roleId: userRole.id,
                        isVerified: true,
                    })
                    .returning();

                await this.db.insert(schema.pointBalance).values({
                    userId: user.id,
                    transactionType: 'credit',
                    amount: 1000,
                    balanceAfter: 1000,
                    description: 'Welcome bonus - New user registration',
                });

                await this.transporter.sendMail({
                    from: this.configService.get('MAIL_FROM'),
                    to: user.email,
                    subject: 'Welcome to Gift Platform!',
                    html: `
                        <h1>Welcome, ${user.name}!</h1>
                        <p>Your account has been successfully created using Google Sign-In.</p>
                        <p>As a welcome gift, we've credited <strong>1000 bonus points</strong> to your account!</p>
                        <p>Start exploring our gift catalog and redeem exciting rewards.</p>
                        <br>
                        <p>Happy shopping!</p>
                        <p>- The Gift Platform Team</p>
                    `,
                });

                isNewUser = true;
            }
        }

        const [role] = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.id, user.roleId))
            .limit(1);

        const tokens = await this.generateTokens(user.id, user.email, user.roleId, role?.name || 'user');

        await this.db
            .update(schema.users)
            .set({ refreshToken: tokens.refreshToken })
            .where(eq(schema.users.id, user.id));

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: role?.name,
                isNewUser,
                bonusPoints: isNewUser ? 1000 : undefined,
            },
            ...tokens,
        };
    }

    async requestOtp(requestOtpDto: RequestOtpDto) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, requestOtpDto.email))
            .limit(1);

        if (!user) {
            throw new BadRequestException('Email not found');
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await this.db
            .update(schema.users)
            .set({ otpCode: otp, otpExpiresAt })
            .where(eq(schema.users.id, user.id));

        await this.transporter.sendMail({
            from: this.configService.get('MAIL_FROM'),
            to: user.email,
            subject: 'Your OTP Code - Gift Platform',
            html: `
        <h1>Your OTP Code</h1>
        <p>Use this code to verify your identity:</p>
        <h2 style="font-size: 32px; letter-spacing: 5px;">${otp}</h2>
        <p>This code expires in 10 minutes.</p>
      `,
        });

        return { message: 'OTP sent to your email' };
    }

    async verifyOtp(otpDto: OtpDto) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.email, otpDto.email))
            .limit(1);

        if (!user) {
            throw new BadRequestException('Invalid OTP');
        }

        if (user.otpCode !== otpDto.otp) {
            throw new BadRequestException('Invalid OTP');
        }

        if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
            throw new BadRequestException('OTP expired');
        }

        await this.db
            .update(schema.users)
            .set({ isVerified: true, otpCode: null, otpExpiresAt: null })
            .where(eq(schema.users.id, user.id));

        const [role] = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.id, user.roleId))
            .limit(1);

        const tokens = await this.generateTokens(user.id, user.email, user.roleId, role?.name || 'user');

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: role?.name,
            },
            ...tokens,
        };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const [user] = await this.db
            .select()
            .from(schema.users)
            .where(eq(schema.users.id, userId))
            .limit(1);

        if (!user || user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const [role] = await this.db
            .select()
            .from(schema.roles)
            .where(eq(schema.roles.id, user.roleId))
            .limit(1);

        const tokens = await this.generateTokens(user.id, user.email, user.roleId, role?.name || 'user');

        await this.db
            .update(schema.users)
            .set({ refreshToken: tokens.refreshToken })
            .where(eq(schema.users.id, user.id));

        return tokens;
    }

    async logout(userId: string) {
        await this.db
            .update(schema.users)
            .set({ refreshToken: null })
            .where(eq(schema.users.id, userId));

        return { message: 'Logged out successfully' };
    }

    private async generateTokens(userId: string, email: string, roleId: string, roleName: string) {
        const payload = { sub: userId, email, roleId, roleName };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
            }),
        ]);

        return { accessToken, refreshToken };
    }
}

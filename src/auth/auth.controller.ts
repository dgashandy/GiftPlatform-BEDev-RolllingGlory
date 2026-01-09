import {
    Controller,
    Post,
    Body,
    Get,
    UseGuards,
    Req,
    Res,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, OtpDto, RequestOtpDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard, JwtRefreshGuard, GoogleAuthGuard } from './guards';
import { CurrentUser } from './decorators';

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
    ) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {
    }

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleAuthCallback(@Req() req: any, @Res() res: any) {
        const result = await this.authService.handleGoogleLogin(req.user);
        const frontendUrl = this.configService.get('FRONTEND_URL');

        const params = new URLSearchParams({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            isNewUser: result.user.isNewUser?.toString() || 'false',
        });

        res.redirect(`${frontendUrl}/auth/callback.html?${params}`);
    }

    @Post('otp/request')
    @HttpCode(HttpStatus.OK)
    async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
        return this.authService.requestOtp(requestOtpDto);
    }

    @Post('otp/verify')
    @HttpCode(HttpStatus.OK)
    async verifyOtp(@Body() otpDto: OtpDto) {
        return this.authService.verifyOtp(otpDto);
    }

    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    async refreshTokens(@CurrentUser() user: any, @Body() body: RefreshTokenDto) {
        return this.authService.refreshTokens(user.id, body.refreshToken);
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    async logout(@CurrentUser('id') userId: string) {
        return this.authService.logout(userId);
    }
}

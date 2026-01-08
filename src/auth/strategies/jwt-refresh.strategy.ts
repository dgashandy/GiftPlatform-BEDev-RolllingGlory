import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_REFRESH_SECRET') || 'fallback-secret',
            passReqToCallback: true,
        });
    }

    async validate(req: any, payload: any) {
        const refreshToken = req.body.refreshToken;
        return {
            id: payload.sub,
            email: payload.email,
            roleId: payload.roleId,
            roleName: payload.roleName,
            refreshToken,
        };
    }
}

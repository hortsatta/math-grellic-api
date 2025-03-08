import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request) {
    // Extract the refresh token
    const refreshToken = req.headers['authorization']?.split(' ')[1];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    // Validate refresh token is still valid
    const payload = await this.authService.validateRefreshToken(refreshToken);

    if (!payload) {
      throw new UnauthorizedException('Refresh token invalid');
    }

    return { sub: payload.sub, email: payload.email };
  }
}

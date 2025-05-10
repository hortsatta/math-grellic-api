import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { validatePassword } from '#/common/helpers/password.helper';
import { User } from '#/modules/user/entities/user.entity';
import { UserApprovalStatus } from '#/modules/user/enums/user.enum';
import { UserService } from '#/modules/user/services/user.service';
import { AuthLoginDto } from '../dtos/auth-login.dto';
import { RedisService } from './redis.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
    @Inject(UserService)
    private readonly userService: UserService,
  ) {}

  async validateUser(authLoginDto: AuthLoginDto): Promise<User> {
    const { email, password } = authLoginDto;
    const user = await this.userService.findOneByEmail(email);

    if (!user || user.approvalStatus !== UserApprovalStatus.Approved) {
      throw new UnauthorizedException('Email not found');
    } else if (!(await validatePassword(password, user.password))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    // Update last login date to now
    this.userService.updateLastLoginDate(user);
    return user;
  }

  async generateTokens(payload: { sub: number; email: string }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Generate access (for login) and refresh token
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    // Store refresh token in Redis for 7 days
    await this.redisService.set(
      `refresh_${payload.sub}`,
      refreshToken,
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }

  async validateRefreshToken(refreshToken: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const storedRefreshToken = await this.redisService.get(
        `refresh_${payload.sub}`,
      );

      if (refreshToken !== storedRefreshToken) {
        throw new UnauthorizedException('Refresh token invalid');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Refresh token invalid');
    }
  }

  login(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email };
    return this.generateTokens(payload);
  }

  async logout(userId: number): Promise<void> {
    await this.redisService.del(`refresh_${userId}`);
  }
}

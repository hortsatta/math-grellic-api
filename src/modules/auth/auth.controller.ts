import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';

import { UseSerializeInterceptor } from '#/common/interceptors/serialize.interceptor';
import { User } from '../user/entities/user.entity';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import {
  UseJwtAuthGuard,
  UseJwtRefreshAuthGuard,
  UseLocalAuthGuard,
} from './auth.guard';
import { AuthResponseDto } from './dtos/auth-response.dto';
import { AuthService } from './services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseLocalAuthGuard()
  @UseSerializeInterceptor(AuthResponseDto)
  async login(@Request() req: ParameterDecorator & { user: User }) {
    return await this.authService.login(req.user);
  }

  @Post('refresh')
  @UseJwtRefreshAuthGuard()
  async refresh(@CurrentUser() payload: any) {
    return this.authService.generateTokens(payload);
  }

  @Post('logout')
  @UseJwtAuthGuard()
  async logout(@CurrentUser() user: User): Promise<boolean> {
    try {
      await this.authService.logout(user.id);
      return true;
    } catch (error) {
      return false;
    }
  }
}

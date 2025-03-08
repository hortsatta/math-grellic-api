import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { User } from '#/modules/user/entities/user.entity';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' }); // Use email instead of username
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser({ email, password });
    return user;
  }
}

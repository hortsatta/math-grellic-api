import { INestApplicationContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from 'jsonwebtoken';

import { UserService } from '#/modules/user/services/user.service';

export class WebSocketAdapter extends IoAdapter {
  private configService: ConfigService;
  private jwtService: JwtService;
  private userService: UserService;

  constructor(app: INestApplicationContext) {
    super(app);
    this.configService = app.get<ConfigService>(ConfigService);
    this.jwtService = app.get<JwtService>(JwtService);
    // Cannot get user service, so instead resolve it
    app.resolve<UserService>(UserService).then((userService) => {
      this.userService = userService;
    });
  }

  createIOServer(port: number, options?: any) {
    const server: Server = super.createIOServer(port, options);

    server.use(async (socket: Socket, next) => {
      const { token } = socket.handshake?.query || {};

      if (!token) {
        return next(new UnauthorizedException());
      }

      try {
        const payload: any = this.jwtService.verify(token as string, {
          secret: this.configService.get<string>('JWT_SECRET'),
        }) as JwtPayload;
        // Get current user by email and add to request object
        const user = await this.userService.getOneByEmail(payload.email);
        (socket as any).currentUser = user;
        return next();
      } catch (error) {
        return next(error);
      }
    });

    return server;
  }
}

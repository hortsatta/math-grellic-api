import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { MailerService } from './mailer.service';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: configService.get<string>('MAILER_MAIL_USER'),
            clientId: configService.get<string>('MAILER_CLIENT_ID'),
            clientSecret: configService.get<string>('MAILER_CLIENT_SECRET'),
            refreshToken: configService.get<string>('MAILER_REFRESH_TOKEN'),
          },
        },
        defaults: {
          from: `"Math Grellic" <${configService.get<string>(
            'MAILER_MAIL_USER',
          )}>`,
        },
        template: {
          dir: join(__dirname, '..', '..', 'common/templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}

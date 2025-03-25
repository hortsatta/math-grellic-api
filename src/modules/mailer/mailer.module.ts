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
          host: configService.get<string>('MAILER_MAIL_HOST'),
          port: configService.get<number>('MAILER_MAIL_PORT'),
          secure: true,
          auth: {
            user: configService.get<string>('MAILER_MAIL_USER'),
            pass: configService.get<string>('MAILER_MAIL_PASSWORD'),
          },
          connectionTimeout: 30000,
        },
        defaults: {
          from: `"No Reply" ${configService.get<string>('MAILER_MAIL_USER')}`,
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

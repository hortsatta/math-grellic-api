import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

import dayjs from '#/common/configs/dayjs.config';

@Injectable()
export class MailerService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailerService: NestMailerService,
  ) {}

  async sendUserRegisterConfirmation(email: string, firstName?: string) {
    const token = this.jwtService.sign({ email }, { expiresIn: '1d' });

    const confirmationLink = `${this.configService.get<string>(
      'WEB_APP_BASE_URL',
    )}/user/register/confirm?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.configService.get<string>(
          'MAILER_SUBJECT_USER_REGISTER_CONFIRMATION',
        ),
        template: './user-register-confirmation',
        context: {
          name: firstName || email,
          confirmationLink,
          appTitle: this.configService.get<string>('WEB_APP_TITLE'),
          copyrightYear: dayjs().year(),
        },
        attachments: [
          {
            filename: 'logo.png',
            path: join(__dirname, '..', '..', 'assets/logo.png'),
            cid: 'logo',
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserRegisterApproved(
    email: string,
    publicId: string,
    firstName?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.configService.get<string>(
          'MAILER_SUBJECT_USER_REGISTER_APPROVED',
        ),
        template: './user-register-approved',
        context: {
          name: firstName || email,
          publicId,
          loginLink: this.configService.get<string>('WEB_APP_BASE_URL'),
          appTitle: this.configService.get<string>('WEB_APP_TITLE'),
          copyrightYear: dayjs().year(),
        },
        attachments: [
          {
            filename: 'logo.png',
            path: join(__dirname, '..', '..', 'assets/logo.png'),
            cid: 'logo',
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserRegisterRejected(
    reason: string,
    email: string,
    firstName?: string,
  ) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: this.configService.get<string>(
          'MAILER_SUBJECT_USER_REGISTER_REJECTED',
        ),
        template: './user-register-rejected',
        context: {
          name: firstName || email,
          loginLink: this.configService.get<string>('WEB_APP_BASE_URL'),
          appTitle: this.configService.get<string>('WEB_APP_TITLE'),
          copyrightYear: dayjs().year(),
          reason,
        },
        attachments: [
          {
            filename: 'logo.png',
            path: join(__dirname, '..', '..', 'assets/logo.png'),
            cid: 'logo',
          },
        ],
      });
    } catch (error) {
      console.log(error);
    }
  }
}

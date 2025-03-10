import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailerService as NestMailerService } from '@nestjs-modules/mailer';

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

    await this.mailerService.sendMail({
      to: email,
      subject: `${this.configService.get<string>(
        'MAILER_SUBJECT_USER_REGISTER_CONFIRMATION',
      )}`,
      template: './user-register-confirmation',
      context: {
        name: firstName || email,
        confirmationLink,
        appTitle: this.configService.get<string>('WEB_APP_TITLE'),
      },
    });
  }
}

import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ISendMailOptions,
  MailerService as NestMailerService,
} from '@nestjs-modules/mailer';

import dayjs from '#/common/configs/dayjs.config';

@Injectable()
export class MailerService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private readonly mailerService: NestMailerService,
  ) {}

  getBaseMailOptions(
    to: string,
    subject: string,
    template: string,
    context?: object,
    attachments?: any[],
  ): ISendMailOptions {
    return {
      to,
      subject,
      template,
      context: {
        appTitle: this.configService.get<string>('WEB_APP_TITLE'),
        copyrightYear: dayjs().year(),
        ...(context || {}),
      },
      attachments: [
        {
          filename: 'logo.png',
          path: join(__dirname, '..', '..', 'assets/logo.png'),
          cid: 'logo',
        },
        ...(attachments || []),
      ],
    };
  }

  async sendUserRegisterConfirmation(
    email: string,
    firstName?: string,
    isRegisteredBySuperior?: boolean,
  ) {
    const token = this.jwtService.sign(
      { email, isFinal: isRegisteredBySuperior },
      { expiresIn: '1d' },
    );

    const endpoint = isRegisteredBySuperior
      ? '/user/register/confirm/last-step?token='
      : '/user/register/confirm?token=';

    const confirmationLink = `${this.configService.get<string>(
      'WEB_APP_BASE_URL',
    )}${endpoint}${token}`;

    const options = this.getBaseMailOptions(
      email,
      this.configService.get<string>(
        'MAILER_SUBJECT_USER_REGISTER_CONFIRMATION',
      ),
      './user-register-confirmation',
      {
        name: firstName || email,
        confirmationLink,
      },
    );

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserEnrollmentNewConfirmation(
    enrollmentId: number,
    email: string,
    firstName?: string,
  ) {
    const token = this.jwtService.sign(
      { email, enrollmentId },
      { expiresIn: '1d' },
    );

    const endpoint = '/sy/enroll-new/confirm?token=';

    const confirmationLink = `${this.configService.get<string>(
      'WEB_APP_BASE_URL',
    )}${endpoint}${token}`;

    const options = this.getBaseMailOptions(
      email,
      this.configService.get<string>(
        'MAILER_SUBJECT_USER_ENROLLMENT_NEW_CONFIRMATION',
      ),
      './user-enrollment-new-confirmation',
      {
        name: firstName || email,
        confirmationLink,
      },
    );

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserRegisterApproved(
    email: string,
    publicId: string,
    firstName?: string,
  ) {
    const options = this.getBaseMailOptions(
      email,
      this.configService.get<string>('MAILER_SUBJECT_USER_REGISTER_APPROVED'),
      './user-register-approved',
      {
        name: firstName || email,
        publicId,
        loginLink: this.configService.get<string>('WEB_APP_BASE_URL'),
      },
    );

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserEnrollmentApproved(
    schoolYearTitle: string,
    email: string,
    firstName?: string,
  ) {
    const subject = `${this.configService.get<string>(
      'MAILER_SUBJECT_USER_ENROLLMENT_APPROVED',
    )} to ${schoolYearTitle}`;

    const options = {
      to: email,
      subject,
      template: './user-enrollment-approved',
      context: {
        name: firstName || email,
        schoolYearTitle,
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
    };

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserRegisterRejected(
    reason: string,
    email: string,
    firstName?: string,
  ) {
    const options = this.getBaseMailOptions(
      email,
      this.configService.get<string>('MAILER_SUBJECT_USER_REGISTER_REJECTED'),
      './user-register-rejected',
      {
        name: firstName || email,
        reason,
      },
    );

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }

  async sendUserEnrollmentRejected(
    reason: string,
    schoolYearTitle: string,
    email: string,
    firstName?: string,
  ) {
    const subject = `${this.configService.get<string>('MAILER_SUBJECT_USER_ENROLLMENT_REJECTED')} for ${schoolYearTitle}`;

    const options = this.getBaseMailOptions(
      email,
      subject,
      './user-register-rejected',
      {
        name: firstName || email,
        reason,
      },
    );

    try {
      await this.mailerService.sendMail(options);
    } catch (error) {
      console.log(error);
    }
  }
}

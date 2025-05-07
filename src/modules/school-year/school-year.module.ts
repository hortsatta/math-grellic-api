import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailerModule } from '../mailer/mailer.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserModule } from '../user/user.module';
import { SchoolYear } from './entities/school-year.entity';
import { SchoolYearEnrollment } from './entities/school-year-enrollment.entity';
import { SchoolYearController } from './controllers/school-year.controller';
import { SchoolYearEnrollmentController } from './controllers/school-year-enrollment.controller';
import { SchoolYearEnrollmentSubscriber } from './subscribers/school-year-enrollment.subscriber';
import { SchoolYearService } from './services/school-year.service';
import { SchoolYearEnrollmentService } from './services/school-year-enrollment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SchoolYear, SchoolYearEnrollment]),
    MailerModule,
    AuditLogModule,
    forwardRef(() => UserModule),
  ],
  controllers: [SchoolYearController, SchoolYearEnrollmentController],
  providers: [
    SchoolYearEnrollmentSubscriber,
    SchoolYearService,
    SchoolYearEnrollmentService,
  ],
  exports: [SchoolYearService],
})
export class SchoolYearModule {}

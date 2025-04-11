import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailerModule } from '../mailer/mailer.module';
import { CoreModule } from '../core/core.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserController } from './user.controller';
import { UserSubscriber } from './subscribers/user.subscriber';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { AdminUserAccount } from './entities/admin-user-account.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';
import { TeacherUserService } from './services/teacher-user.service';
import { StudentUserService } from './services/student-user.service';
import { AdminUserService } from './services/admin-user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AdminUserAccount,
      TeacherUserAccount,
      StudentUserAccount,
    ]),
    MailerModule,
    CoreModule,
    AuditLogModule,
  ],
  controllers: [UserController],
  providers: [
    UserSubscriber,
    UserService,
    TeacherUserService,
    StudentUserService,
    AdminUserService,
  ],
  exports: [
    UserService,
    TeacherUserService,
    StudentUserService,
    AdminUserService,
  ],
})
export class UserModule {}

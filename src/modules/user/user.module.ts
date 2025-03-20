import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailerModule } from '../mailer/mailer.module';
import { CoreModule } from '../core/core.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { UserController } from './user.controller';
import { UserSubscriber } from './subscribers/user.subscriber';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { AdminUserAccount } from './entities/admin-user-account.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';

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
  providers: [UserSubscriber, UserService],
  exports: [UserService],
})
export class UserModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { CoreModule } from '../core/core.module';
import { UserController } from './user.controller';
import { UserSubscriber } from './subscribers/user.subscriber';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { TeacherUserAccount } from './entities/teacher-user-account.entity';
import { StudentUserAccount } from './entities/student-user-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TeacherUserAccount, StudentUserAccount]),
    JwtModule.register({
      global: true,
    }),
    CoreModule,
  ],
  controllers: [UserController],
  providers: [UserSubscriber, UserService],
  exports: [UserService],
})
export class UserModule {}

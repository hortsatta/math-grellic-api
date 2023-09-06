import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './database.module';
import { CoreModule } from './core/core.module';
import { UserModule } from './user/user.module';
import { LessonModule } from './lesson/lesson.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),
    DatabaseModule,
    CoreModule,
    UserModule,
    LessonModule,
  ],
  controllers: [],
})
export class AppModule {}

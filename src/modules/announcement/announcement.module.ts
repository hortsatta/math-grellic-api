import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserModule } from '../user/user.module';
import { SchoolYearModule } from '../school-year/school-year.module';
import { AnnouncementController } from './announcement.controller';
import { AnnouncementService } from './announcement.service';
import { Announcement } from './entities/announcement.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Announcement]),
    UserModule,
    SchoolYearModule,
  ],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
})
export class AnnouncementModule {}

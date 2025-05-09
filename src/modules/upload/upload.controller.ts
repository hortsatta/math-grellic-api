import { Controller, Post, Query, UploadedFiles } from '@nestjs/common';
import { FastifyFilesInterceptor } from 'nest-fastify-multer';

import { UseJwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { UserRole } from '../user/enums/user.enum';
import { User } from '../user/entities/user.entity';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import { UploadService } from './upload.service';

const imageValidationOptions = {
  maxSize: 5242880,
  fileTypes: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('/exams/images')
  @UseJwtAuthGuard(UserRole.Teacher)
  @FastifyFilesInterceptor('files')
  async uploadExamImages(
    @UploadedFiles(new FileValidationPipe(imageValidationOptions))
    files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
    @Query('strict') strict?: number,
  ): Promise<string[]> {
    const { publicId } = user;
    return this.uploadService.uploadExamImages(
      files,
      publicId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
      strict == 1,
    );
  }

  @Post('/activities/images')
  @UseJwtAuthGuard(UserRole.Teacher)
  @FastifyFilesInterceptor('files')
  async uploadActivitiesImages(
    @UploadedFiles(new FileValidationPipe(imageValidationOptions))
    files: Express.Multer.File[],
    @CurrentUser() user: User,
    @Query('sy') schoolYearId?: number,
    // @Query('strict') strict?: number,
  ): Promise<string[]> {
    const { publicId } = user;
    return this.uploadService.uploadActivityImages(
      files,
      publicId,
      isNaN(schoolYearId) ? undefined : schoolYearId,
    );
  }
}

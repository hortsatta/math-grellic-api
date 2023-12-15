import { Body, Controller, Post, UploadedFiles } from '@nestjs/common';
import { FastifyFilesInterceptor } from 'nest-fastify-multer';

import { FileValidationPipe } from './pipes/file-validation.pipe';
import { UploadFileOptionsDto } from './dtos/upload-file-options.dto';
import { UploadService } from './upload.service';

const imageValidationOptions = {
  maxSize: 5242880,
  fileTypes: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
};

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('/images')
  @FastifyFilesInterceptor('files')
  async uploadImages(
    @UploadedFiles(new FileValidationPipe(imageValidationOptions))
    files: Express.Multer.File[],
    @Body() body: UploadFileOptionsDto,
  ): Promise<string[]> {
    console.log('files', files);
    console.log('body', body);

    return this.uploadService.uploadImages(files, body);
  }
}

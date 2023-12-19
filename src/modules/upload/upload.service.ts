import path from 'path';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp, { AvailableFormatInfo, FitEnum, FormatEnum } from 'sharp';

import { SupabaseService } from '../core/supabase.service';

const COMPRESSION_OPTIONS = {
  width: 800,
  height: null,
  fit: sharp.fit.inside,
  format: 'avif' as keyof FormatEnum,
  formatOptions: { quality: 70 },
};

@Injectable()
export class UploadService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async uploadExActImages(
    files: Express.Multer.File[],
    publicId: string,
    isExam?: boolean,
  ) {
    const baseName = files[0]?.originalname?.split('-')[0];

    if (!this.validateFiles(files, baseName)) {
      throw new BadRequestException('Invalid filename');
    }

    const basePath = `${this.configService.get<string>(
      'SUPABASE_BASE_FOLDER_NAME',
    )}/${publicId.toLowerCase()}/${
      isExam ? 'exams' : 'activities'
    }/${baseName}`;

    try {
      const transformedFiles = await Promise.all(
        files.map(async ({ buffer, ...moreFile }) => ({
          ...moreFile,
          buffer: await this.resize(
            buffer,
            COMPRESSION_OPTIONS.width,
            COMPRESSION_OPTIONS.height,
            COMPRESSION_OPTIONS.fit,
            COMPRESSION_OPTIONS.format,
            COMPRESSION_OPTIONS.formatOptions,
          ),
        })),
      );

      const results = await Promise.all(
        transformedFiles.map(({ buffer, originalname }) => {
          const filename = path.parse(originalname).name;
          const questionFolderName = filename.split('-')[1] || '';
          const targetFilename = `${filename}.${COMPRESSION_OPTIONS.format}`;
          const targetPath = `${basePath}/${questionFolderName}/${targetFilename}`;

          console.log(originalname);
          console.log(questionFolderName);
          console.log(targetFilename);

          return this.supabaseService
            .getClient()
            .storage.from(this.configService.get<string>('SUPABASE_BUCKET_ID'))
            .upload(targetPath, buffer, {
              cacheControl: '3600',
              upsert: true,
            });
        }),
      );

      return results.map(({ data }) => data.path);
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(
        'An error has occured. Upload failed',
      );
    }
  }

  // MISC

  resize(
    input: Buffer,
    width: number | null,
    height: number | null,
    fit: keyof FitEnum,
    format: keyof FormatEnum | AvailableFormatInfo,
    formatOptions: { quality: number },
  ) {
    return sharp(input)
      .resize(width, height, {
        fit,
        withoutEnlargement: true,
      })
      .toFormat(format, formatOptions)
      .toBuffer();
  }

  validateFiles(files: Express.Multer.File[], baseName?: string) {
    if (!baseName || (baseName[0] !== 'e' && baseName[0] !== 'a')) {
      return false;
    }

    const baseChar = baseName[0];

    // Check question images
    const questions = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length >= 2 &&
        splitNames[0].includes(baseChar) &&
        splitNames[1].includes('q')
      );
    });
    // Check choices images
    const choices = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length >= 3 &&
        splitNames[0].includes(baseChar) &&
        splitNames[1].includes('q') &&
        splitNames[0].includes('c')
      );
    });

    return questions.length + choices.length === files.length;
  }
}

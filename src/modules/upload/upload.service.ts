import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp, { AvailableFormatInfo, FitEnum, FormatEnum } from 'sharp';

import { SupabaseService } from '../core/supabase.service';
import { UploadFileOptionsDto } from './dtos/upload-file-options.dto';

const DEFAULT_RESIZE = {
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

  async uploadImages(
    files: Express.Multer.File[],
    options: UploadFileOptionsDto,
  ) {
    const { baseName, folderName } = options || {};

    // Sequential file upload
    // const uploaded = [];
    // for (const [_, value] of files.entries()) {
    //   await Promise.all(
    //     RESIZE_SET.map((size) =>
    //       this.resize(value.buffer, size.width, size.height, size.fit, 'avif'),
    //     ),
    //   );

    //   uploaded.push(`${baseName}.avif`);
    // }

    try {
      const transformedFiles = await Promise.all(
        files.map(({ buffer }) =>
          this.resize(
            buffer,
            DEFAULT_RESIZE.width,
            DEFAULT_RESIZE.height,
            DEFAULT_RESIZE.fit,
            DEFAULT_RESIZE.format,
            DEFAULT_RESIZE.formatOptions,
          ),
        ),
      );

      const results = await Promise.all(
        transformedFiles.map((file) =>
          this.supabaseService
            .getClient()
            .storage.from(this.configService.get<string>('SUPABASE_BUCKET_ID'))
            .upload(`public/avatar1.${DEFAULT_RESIZE.format}`, file, {
              cacheControl: '3600',
              upsert: true,
            }),
        ),
      );

      console.log('asd', results);

      return results.map(({ data }) => data.path);
    } catch (error) {
      console.log('error', error);
      throw new InternalServerErrorException(
        'An error has occured. Upload failed',
      );
    }
  }
}

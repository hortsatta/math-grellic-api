import path from 'path';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp, { AvailableFormatInfo, FitEnum, FormatEnum } from 'sharp';

import { SupabaseService } from '../core/supabase.service';
import { SchoolYearService } from '../school-year/services/school-year.service';

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
    @Inject(SchoolYearService)
    private readonly schoolYearService: SchoolYearService,
    private readonly supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async uploadExamImages(
    files: Express.Multer.File[],
    publicId: string,
    schoolYearId?: number,
    strict?: boolean,
  ) {
    const baseName = files[0]?.originalname?.split('-')[0];

    if (!this.validateExamFiles(files, baseName)) {
      throw new BadRequestException('Invalid filename');
    }

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const basePath = `${this.configService.get<string>(
      'SUPABASE_BASE_FOLDER_NAME',
    )}/${publicId.toLowerCase()}/exams/${baseName}_${schoolYear.id}`;

    try {
      if (strict) {
        await this.deleteFolderRecursively(basePath);
      }

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
      throw new InternalServerErrorException(
        'An error has occured. Upload failed',
      );
    }
  }

  async uploadActivityImages(
    files: Express.Multer.File[],
    publicId: string,
    schoolYearId?: number,
  ) {
    const baseName = files[0]?.originalname?.split('-')[0];

    if (!this.validateActivityFiles(files, baseName)) {
      throw new BadRequestException('Invalid filename');
    }

    // Get target SY or if undefined, then get current SY
    const schoolYear =
      schoolYearId != null
        ? await this.schoolYearService.getOneById(schoolYearId)
        : await this.schoolYearService.getCurrentSchoolYear();

    if (!schoolYear) {
      throw new BadRequestException('Invalid school year');
    }

    const basePath = `${this.configService.get<string>(
      'SUPABASE_BASE_FOLDER_NAME',
    )}/${publicId.toLowerCase()}/activities/${baseName}_${schoolYear.id}`;

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
          const levelFolderName = filename.split('-')[1] || '';
          const questionFolderName = filename.split('-')[2] || '';
          const targetFilename = `${filename}.${COMPRESSION_OPTIONS.format}`;
          const targetPath = `${basePath}/${levelFolderName}/${questionFolderName}/${targetFilename}`;

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
      throw new InternalServerErrorException(
        'An error has occured. Upload failed',
      );
    }
  }

  // Function to delete a folder and all its contents
  async deleteFolderRecursively(folderPath: string): Promise<boolean> {
    try {
      // List all files recursively
      const filesDeletionList = await this.listAllFilesRecursively(folderPath);
      // Add the folder itself to the list of files to delete
      filesDeletionList.push(folderPath);
      // Delete all files in batches (Supabase allows up to 1000 files per request)
      const batchSize = 1000;
      for (let i = 0; i < filesDeletionList.length; i += batchSize) {
        const batch = filesDeletionList.slice(i, i + batchSize);
        await this.supabaseService
          .getClient()
          .storage.from(this.configService.get<string>('SUPABASE_BUCKET_ID'))
          .remove(batch);
      }

      return true;
    } catch (error) {
      throw new InternalServerErrorException(
        'An error has occured. Action failed',
      );
    }
  }

  // MISC

  async listAllFilesRecursively(folderPath: string): Promise<string[]> {
    let files = [];
    let currentPage = 0;

    while (true) {
      // List files in the current folder (paginated)
      const { data, error } = await this.supabaseService
        .getClient()
        .storage.from(this.configService.get<string>('SUPABASE_BUCKET_ID'))
        .list(folderPath, {
          limit: 100, // Max files per page (Supabase allows up to 100)
          offset: currentPage * 100,
        });

      if (error) {
        throw error;
      }

      if (data.length === 0) {
        break; // No more files to list
      }

      // Process each file or subfolder
      for (const file of data) {
        const filePath = `${folderPath}/${file.name}`;

        if (file.id) {
          // If it's a file, add it to the list
          files.push(filePath);
        } else {
          // If it's a folder, recursively list its contents
          const subFolderFiles = await this.listAllFilesRecursively(filePath);
          files = files.concat(subFolderFiles);
        }
      }

      currentPage++;
    }

    return files;
  }

  validateExamFiles(files: Express.Multer.File[], baseName?: string) {
    if (!baseName || baseName[0] !== 'e') {
      return false;
    }

    const baseChar = baseName[0];

    // Check question images
    const questions = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length == 3 &&
        splitNames[0].includes(baseChar) &&
        splitNames[1].includes('q')
      );
    });
    // Check choices images
    const choices = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length === 4 &&
        splitNames[0].includes(baseChar) &&
        splitNames[1].includes('q') &&
        splitNames[2]?.includes('c')
      );
    });

    return questions.length + choices.length === files.length;
  }

  validateActivityFiles(files: Express.Multer.File[], baseName?: string) {
    if (!baseName || baseName[0] !== 'a') {
      return false;
    }

    const baseChar = baseName[0];

    // Check question images
    const questions = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length === 3 &&
        splitNames[0].includes(baseChar) &&
        // Level
        splitNames[1].includes('l') &&
        splitNames[2].includes('q')
      );
    });
    // Check choices images
    const choices = files.filter((file) => {
      const filename = path.parse(file.originalname).name;
      const splitNames = filename.split('-');
      return (
        splitNames.length === 4 &&
        splitNames[0].includes(baseChar) &&
        splitNames[1].includes('l') &&
        splitNames[2].includes('q') &&
        splitNames[3]?.includes('c')
      );
    });

    return questions.length + choices.length === files.length;
  }

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
}

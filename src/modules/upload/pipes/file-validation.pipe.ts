import {
  BadRequestException,
  Injectable,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  // maxSize in bytes and fileTypes is array of strings
  constructor(private options?: { maxSize?: number; fileTypes?: string[] }) {}

  transform(value: Express.Multer.File[] | Express.Multer.File) {
    if (!value) {
      return value;
    }

    if (Array.isArray(value)) {
      this.validateFiles(value);
    } else {
      this.validateFile(value);
    }

    return value;
  }

  validateFiles(value: Express.Multer.File[]) {
    for (const singleFile of value) {
      this.validateFile(singleFile);
    }
  }

  validateFile(value: Express.Multer.File) {
    const { maxSize, fileTypes } = this.options || {};

    if (maxSize) {
      const maxKbSize = Math.floor(maxSize / 1024);
      if (value.size > maxSize) {
        throw new BadRequestException(`File size is more than ${maxKbSize} KB`);
      }
    }

    if (fileTypes) {
      const isValid = fileTypes.some((ft) => value.mimetype.includes(ft));
      if (!isValid) {
        throw new UnprocessableEntityException(
          `${value.mimetype} format isn't supported`,
        );
      }
    }
  }
}

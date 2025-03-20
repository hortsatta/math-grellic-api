import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from './entities/audit-log.entity';
import { AuditLogCreateDto } from './dtos/audit-log-create.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  create(
    auditLogDto: AuditLogCreateDto,
    currentUserId: number,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepo.create({
      ...auditLogDto,
      user: { id: currentUserId },
    });

    return this.auditLogRepo.save(auditLog);
  }
}

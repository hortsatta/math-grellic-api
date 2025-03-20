import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

import { Base as BaseEntity } from '#/common/entities/base.entity';
import { User } from '#/modules/user/entities/user.entity';
import { AuditFeatureType } from '../enums/audit-log.enum';

@Entity()
export class AuditLog extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  actionName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actionValue: string;

  @Column()
  featureId: number; // Stores the id of the target entity (user, exam, lesson)

  @Column({
    type: 'enum',
    enum: AuditFeatureType,
  })
  featureType: AuditFeatureType;

  @ManyToOne(() => User, (user) => user.auditLogs, { onDelete: 'CASCADE' })
  @JoinColumn()
  user: User;
}

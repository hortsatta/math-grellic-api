import { Base as BaseEntity } from '#/common/entities/base.entity';
import { Column } from 'typeorm';

import { UserGender } from '../enums/user.enum';

export abstract class UserAccount extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  middleName: string;

  @Column({ type: 'timestamp' })
  birthDate: Date;

  @Column({ type: 'varchar', length: 11 })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: UserGender,
  })
  gender: UserGender;
}

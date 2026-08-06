import { BaseEntity } from '@org/backend-base';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('user_recovery_codes')
export class UserRecoveryCodeEntity extends BaseEntity {
  @Index('idx_user_recovery_codes_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /** Argon2 hash: these are single-use passwords and get the same treatment as one. */
  @Column({ name: 'code_hash', type: 'text' })
  codeHash!: string;

  /** Set on use rather than deleting the row, so a spent code stays visible. */
  @Column({ name: 'used_at', type: 'timestamp with time zone', nullable: true })
  usedAt!: Date | null;
}

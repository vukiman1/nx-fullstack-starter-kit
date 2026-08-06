import { BaseEntity } from '@org/backend-base';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('user_totp')
export class UserTotpEntity extends BaseEntity {
  @Index('idx_user_totp_user_id', { unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  /** Ciphertext: a leaked row must not be enough to mint valid codes. */
  @Column({ name: 'secret', type: 'text' })
  secret!: string;

  /** Null until a correct code proves the app holds the secret; until then this protects nothing. */
  @Column({ name: 'confirmed_at', type: 'timestamp with time zone', nullable: true })
  confirmedAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamp with time zone', nullable: true })
  lastUsedAt!: Date | null;
}

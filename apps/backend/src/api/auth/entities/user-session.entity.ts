import { BaseEntity } from '@org/backend-base';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('user_sessions')
@Index(['userId', 'revokedAt'])
@Index(['userId', 'expiresAt'])
export class UserSessionEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'jti', type: 'uuid', unique: true })
  jti!: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 255, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'browser_name', type: 'varchar', length: 120, nullable: true })
  browserName!: string | null;

  @Column({ name: 'os_name', type: 'varchar', length: 120, nullable: true })
  osName!: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 80, nullable: true })
  deviceType!: string | null;

  @Column({ name: 'remember_me', type: 'boolean', default: false })
  rememberMe!: boolean;

  @Column({ name: 'last_seen_at', type: 'timestamp', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 120, nullable: true })
  revokeReason!: string | null;
}

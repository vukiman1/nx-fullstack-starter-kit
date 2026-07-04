import { BaseEntity } from '@org/backend-base';
import { AuthProvider } from '@org/backend-enum';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { UserEntity } from '../../user/entities/user.entity';

@Entity('auth_identities')
@Unique('UQ_identity_provider_account', ['provider', 'providerAccountId'])
@Index(['userId'])
export class AuthIdentityEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ name: 'provider', type: 'varchar', length: 40 })
  provider!: AuthProvider;

  @Column({ name: 'provider_account_id', type: 'varchar', length: 255 })
  providerAccountId!: string;

  @Column({ name: 'email', type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ name: 'email_verified', type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  displayName!: string | null;

  @Column({ name: 'avatar', type: 'varchar', length: 512, nullable: true })
  avatar!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
}

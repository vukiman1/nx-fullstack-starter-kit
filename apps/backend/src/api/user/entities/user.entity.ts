import { BaseEntity } from '@org/backend-base';
import { Roles } from '@org/backend-enum';
import { Exclude } from 'class-transformer';
import { BeforeInsert, BeforeUpdate, Column, Entity, Index, Unique } from 'typeorm';
import * as argon2 from 'argon2';

const ARGON2_HASH_PREFIX = '$argon2';

@Entity('users')
@Unique(['email'])
@Index('fulltext_index', ['email'], { fulltext: true })
export class UserEntity extends BaseEntity {
  @Column({
    unique: true,
    nullable: false,
    type: 'varchar',
    length: 255,
    name: 'email',
  })
  email!: string;

  /** Optional: accounts created through Google can arrive without one. */
  @Column({ type: 'varchar', nullable: true, length: 255, name: 'display_name' })
  displayName!: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 255,
    name: 'avatar',
  })
  avatar: string;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'balance',
  })
  balance!: number;

  @Column({
    type: 'int',
    nullable: false,
    default: 0,
    name: 'token',
  })
  token!: number;

  @Column({ nullable: true, type: 'varchar', length: 255, name: 'password' })
  @Exclude()
  password!: string | null;

  @Column({
    type: 'boolean',
    nullable: false,
    default: false,
    name: 'is_email_verified',
  })
  isEmailVerified!: boolean;

  @Column({
    type: 'enum',
    enum: Roles,
    nullable: false,
    default: Roles.USER,
  })
  role!: Roles;

  // OAuth-only users have no password; only hash a freshly assigned plaintext value.
  // An already hashed value (loaded then re-saved) starts with `$argon2` and is left as is.
  @BeforeInsert()
  @BeforeUpdate()
  async hashPasswordIfPlaintext() {
    if (this.password && !this.password.startsWith(ARGON2_HASH_PREFIX)) {
      this.password = await argon2.hash(this.password);
    }
  }
}

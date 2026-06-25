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

  @Column({ nullable: false, type: 'varchar', length: 255, name: 'password' })
  @Exclude()
  password!: string;

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

  @BeforeInsert()
  async beforeInsert() {
    this.password = await argon2.hash(this.password);
  }

  // Hash on update only when a fresh plaintext password was assigned; an already
  // hashed value (loaded then re-saved unchanged) starts with `$argon2` and is left as is.
  @BeforeUpdate()
  async beforeUpdate() {
    if (this.password && !this.password.startsWith(ARGON2_HASH_PREFIX)) {
      this.password = await argon2.hash(this.password);
    }
  }
}

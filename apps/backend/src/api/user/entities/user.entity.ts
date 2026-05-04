import { BaseEntity } from '@app/base';
import { Roles } from '@app/enum';
import { Exclude } from 'class-transformer';
import { BeforeInsert, Column, Entity, Index, Unique } from 'typeorm';
import * as argon2 from 'argon2';

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
}

import { Injectable } from '@nestjs/common';
import { BaseService } from '@app/base';
import { UserEntity } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserService extends BaseService<UserEntity> {
  name = 'User';
  constructor(
    @InjectRepository(UserEntity)
    public readonly userRepo: Repository<UserEntity>,
  ) {
    super(userRepo);
  }

  async testGetAllUsers() {
    return this.getAll();
  }

  async getUserCredit(id: string) {
    const user = await this.getOneOrFail({ id });
    return {
      balance: user.balance,
      token: user.token,
    };
  }
}

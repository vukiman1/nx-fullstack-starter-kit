import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RegisterDto } from '../dto/register.dto';
import { CryptoService } from '@app/crypto';
import { UserEntity } from 'src/api/user/entities/user.entity';
import { JwtService } from '@app/jwt';
import { UserService } from 'src/api/user/user.service';
import { clearCookie, CookieName, setCookie } from '@app/helpers';
import { RedisService } from '@app/redis';
import { UserType } from '../interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}
  me(user: UserEntity) {
    const { email, avatar, balance } = user;
    return {
      user: { email, avatar, balance },
    };
  }
  async login(user: UserEntity, response: Response) {
    const { id, email, avatar, balance } = user;
    const payload = { id };
    const accessToken = await this.jwtService.signJwt(payload);
    const refreshToken = await this.jwtService.signJwt(payload, true);

    this.redisService.setRefreshToken(id, refreshToken);
    this.redisService.setAccessToken(id, accessToken);

    const encryptId = this.cryptoService.encryptData(id);
    setCookie(response, CookieName.SESSION, encryptId);
    setCookie(response, CookieName.ACCESS_TOKEN, accessToken);

    return {
      user: { email, avatar, balance },
    };
  }

  async register({ email, password, confirmPassword }: RegisterDto) {
    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }
    const existingUser = await this.userService.getOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    await this.userService.create({
      email,
      password,
    });

    return {
      message: 'User registered successfully',
      email,
    };
  }
  async logout(user: UserEntity, response: Response) {
    const { id } = user;
    await this.redisService.delRFToken(id);
    await this.redisService.delAccessToken(id);
    clearCookie(response, CookieName.ACCESS_TOKEN);
    clearCookie(response, CookieName.SESSION);
    return {
      message: 'Logout successfully',
    };
  }

  async refreshToken(request: Request, response: Response, userType: UserType) {
    const { sub } = request.cookies;
    if (!sub) {
      throw new NotFoundException('Refresh token not found');
    }

    const decryptData = this.cryptoService.decryptData(sub);
    const refreshToken = await this.redisService.getRefreshToken(decryptData);
    const user = await this.getUser(refreshToken, userType);
    const { id, email, avatar, balance } = user;
    const accessToken = await this.jwtService.signJwt({ id });
    this.redisService.setAccessToken(id, accessToken);
    setCookie(response, CookieName.ACCESS_TOKEN, accessToken);

    return {
      user: { email, avatar, balance },
    };
  }

  async getUser(refreshToken: string, userType: UserType) {
    const { id } = await this.jwtService.verifyJwt(refreshToken);
    const where = { id };
    const targetServices = this.getService(userType);
    const user = await targetServices.getOne(where);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private getService(type: UserType) {
    switch (type) {
      case 'user':
        return this.userService;
      default:
        return this.userService;
    }
  }
}

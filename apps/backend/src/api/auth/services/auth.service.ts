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
import { SetCookieRFToken } from '@app/helpers/setCookieRFToken';
import { RedisService } from '@app/redis';
import { LoginResponse, UserType } from '../interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}
  findAll() {
    return {
      message: 'Auth me',
    };
  }
  async login(user: UserEntity, response: Response): Promise<LoginResponse> {
    const { id, role, email, avatar } = user;
    const payload = { id };
    // // Generate accessToken
    const accessToken = await this.jwtService.signJwt(payload);
    const refreshToken = await this.jwtService.signJwt(payload, true);

    // // Cache token
    this.redisService.setRefreshToken(id, refreshToken);
    this.redisService.setAccessToken(id, accessToken);

    // // Encrypt cookie
    const encryptId = this.cryptoService.encryptData(id);
    SetCookieRFToken(response, encryptId);
    const result = {
      user: {
        id,
        role,
        email,
        avatar,
        balance: user.balance,
        token: user.token,
      },
      accessToken,
    };
    return result;
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
  async logout(user: UserEntity) {
    const { id } = user;
    await this.redisService.delRFToken(id);
    await this.redisService.delAccessToken(id);
    return {
      message: 'Logout successfully',
    };
  }

  async refreshToken(request: Request, userType: UserType) {
    const { sub } = request.cookies;

    const decryptData = this.cryptoService.decryptData(sub);
    const refreshToken = await this.redisService.getRefreshToken(decryptData);
    // Get Token from refresh token
    const user = await this.getUser(refreshToken, userType);
    const { id } = user;
    const accessToken = await this.jwtService.signJwt({ id });
    const result = { user, accessToken };
    return result;
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

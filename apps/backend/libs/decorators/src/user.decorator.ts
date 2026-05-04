import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

// Mở rộng interface Request để bao gồm thuộc tính user
declare module 'express' {
  interface Request {
    user?: any;
  }
}

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

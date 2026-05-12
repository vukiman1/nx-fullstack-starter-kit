import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

type RequestWithUser = Request & { user?: unknown };

export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);

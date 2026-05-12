import { OkResponse } from '@org/backend-base';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, getSchemaPath } from '@nestjs/swagger';
import { UserType } from './interfaces/auth.interface';
import { UserEntity } from '../user/entities/user.entity';

const getRef = (userType: UserType) => {
  let $ref;

  switch (userType) {
    case 'user':
      $ref = UserEntity;
      break;
  }

  return $ref;
};

const loginResponse = (userType: UserType) => ({
  properties: {
    result: {
      type: 'array',
      items: {
        properties: {
          user: {
            $ref: getSchemaPath(getRef(userType)),
          },
          accessToken: { example: 'string' },
        },
      },
    },
  },
});
export function ApiLogin(userType: UserType) {
  return applyDecorators(
    ApiOperation({ summary: 'Login for ' + userType }),
    OkResponse(null, false, loginResponse(userType)),
  );
}

export function ApiRefreshToken(userType: UserType) {
  return applyDecorators(
    ApiOperation({ summary: 'Refresh token for ' + userType }),
    OkResponse(null, false, loginResponse(userType)),
  );
}

export function ApiChangePassword(userType: UserType) {
  return applyDecorators(
    ApiOperation({ summary: 'Change password for ' + userType }),
    OkResponse(getRef(userType)),
  );
}

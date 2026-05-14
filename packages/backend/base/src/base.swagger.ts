import { Type, applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, getSchemaPath } from '@nestjs/swagger';

type SwaggerModel = Type<unknown> | string;

interface ReferenceObject {
  $ref: string;
}

interface SchemaObject {
  type?: string;
  example?: unknown;
  items?: SchemaObject | ReferenceObject;
  properties?: Record<string, SchemaObject | ReferenceObject>;
  required?: string[];
  enum?: unknown[];
  format?: string;
  description?: string;
  nullable?: boolean;
}

export function OkResponse(
  $ref: SwaggerModel | null,
  isPagination = false,
  data?: SchemaObject | ReferenceObject,
) {
  const properties: Record<string, SchemaObject | ReferenceObject> = {
    statusCode: { example: 200 },
    success: { example: true },
  };
  if ($ref) {
    let metadata: SchemaObject | ReferenceObject | undefined;
    let refData: SchemaObject | ReferenceObject = { $ref: getSchemaPath($ref) };
    if (isPagination) {
      refData = {
        type: 'array',
        items: { $ref: getSchemaPath($ref) },
      };
      metadata = {
        example: {
          limit: 0,
          page: 0,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }
    Object.assign(properties, { data: refData });
    if (metadata) {
      Object.assign(properties, { metadata });
    }
  }

  if (data) {
    Object.assign(properties, { data });
  }

  return ApiOkResponse({
    schema: {
      properties,
    },
  });
}

export function CreatedResponse($ref: SwaggerModel) {
  return ApiCreatedResponse({
    schema: {
      properties: {
        status: { example: 200 },
        data: {
          properties: {
            result: {
              type: 'array',
              items: {
                $ref: getSchemaPath($ref),
              },
            },
          },
        },
      },
    },
  });
}

export function ApiCreate($ref: SwaggerModel, name?: string) {
  return applyDecorators(ApiOperation({ summary: 'Create new ' + name }), CreatedResponse($ref));
}

export function ApiGetAll($ref: SwaggerModel, name?: string) {
  return applyDecorators(ApiOperation({ summary: 'Get all ' + name }), OkResponse($ref, true));
}

export function ApiGetDetail($ref: SwaggerModel, name?: string) {
  return applyDecorators(ApiOperation({ summary: 'Get detail ' + name }), OkResponse($ref));
}

export function ApiUpdate($ref: SwaggerModel, name?: string) {
  return applyDecorators(ApiOperation({ summary: 'Update ' + name }), OkResponse($ref));
}

export function ApiDelete($ref: SwaggerModel, name?: string) {
  return applyDecorators(ApiOperation({ summary: 'Delete ' + name }), OkResponse($ref));
}

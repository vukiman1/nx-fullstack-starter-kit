import { Body, Delete, Get, Param, Patch, Post, Query, Type, ValidationPipe } from '@nestjs/common';
import type { DeepPartial, FindOptionsOrder } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { PaginationDto } from './base.dto';
import { BaseEntity } from './base.entity';
import { BaseService } from './base.service';
import { ApiCreate, ApiDelete, ApiGetAll, ApiGetDetail, ApiUpdate } from './base.swagger';

export interface CrudBodies {
  create: Type<object>;
  update: Type<object>;
}

function bodyPipe(expectedType: Type<object>) {
  return new ValidationPipe({
    expectedType,
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
}

export function BaseController<Entity extends BaseEntity>(
  $ref: Type<unknown> | string,
  bodies: CrudBodies,
  name?: string,
) {
  const createPipe = bodyPipe(bodies.create);
  const updatePipe = bodyPipe(bodies.update);
  const newestFirst = { createdAt: 'DESC' } as FindOptionsOrder<Entity>;

  abstract class Controller {
    abstract relations: string[];

    constructor(public readonly service: BaseService<Entity>) {}

    @Post('create')
    @ApiCreate($ref, name)
    create(@Body(createPipe) body: DeepPartial<Entity>): Promise<Entity> {
      return this.service.create(body);
    }

    @Get('all')
    @ApiGetAll($ref, name)
    getAll(@Query() query: PaginationDto): Promise<[Entity[], number]> {
      return this.service.getAllWithPagination(query, {}, newestFirst, ...this.relations);
    }

    @Get('detail/:id')
    @ApiGetDetail($ref, name)
    getDetail(@Param('id') id: string): Promise<Entity> {
      return this.service.getOneByIdOrFail(id, ...this.relations);
    }

    @Patch('update/:id')
    @ApiUpdate($ref, name)
    update(
      @Param('id') id: string,
      @Body(updatePipe) body: QueryDeepPartialEntity<Entity>,
    ): Promise<Entity> {
      return this.service.updateById(id, body);
    }

    @Delete('delete/:id')
    @ApiDelete($ref, name)
    delete(@Param('id') id: string): Promise<Entity> {
      return this.service.softDeleteById(id);
    }
  }

  return Controller;
}

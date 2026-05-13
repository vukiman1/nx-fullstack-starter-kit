import {
  FindOptionsOrder,
  FindOptionsWhere,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationToQuery } from './paginationToQuery';
import { BaseEntity } from './base.entity';
import { PaginationDto } from './base.dto';

type SortDirection = 'ASC' | 'DESC';

export function getQueryBuilder<Entity extends BaseEntity>(
  repo: Repository<Entity>,
  query: PaginationDto,
  where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  order?: FindOptionsOrder<Entity>,
  ...relations: string[]
) {
  const { skip, take } = PaginationToQuery(query);
  const queryRecord = query as Record<string, unknown>;
  delete queryRecord.limit;
  delete queryRecord.page;
  let queryBuilder = repo.createQueryBuilder('entity');
  queryBuilder = addRelations(queryBuilder, relations);
  if (where) {
    queryBuilder = addWhere(queryBuilder, where);
    queryBuilder = addQuery(queryBuilder, where, query);
  }
  queryBuilder.skip(skip).take(take);
  for (const orderKey in order) {
    const direction = String(order[orderKey]).toUpperCase() as SortDirection;
    queryBuilder.orderBy(`entity.${orderKey}`, direction);
  }
  return queryBuilder;
}

function addRelations<Entity extends BaseEntity>(
  queryBuilder: SelectQueryBuilder<Entity>,
  relations: string[],
) {
  relations.forEach((relation) => {
    queryBuilder.leftJoinAndSelect(`entity.${relation}`, relation);
  });
  return queryBuilder;
}
function addWhere<Entity extends BaseEntity>(
  queryBuilder: SelectQueryBuilder<Entity>,
  where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
) {
  const whereKeys = Object.keys(where);
  for (let i = 0; i < whereKeys.length; i++) {
    const key = whereKeys[i];
    let queryString = `entity.${key} = ${where[key]}`;
    if (typeof where[key] === 'string') {
      queryString = `entity.${key} = '${where[key]}'`;
    }
    let whereMethod = 'andWhere';
    if (i === 0) {
      whereMethod = 'where';
    }
    queryBuilder[whereMethod](queryString);
  }
  return queryBuilder;
}
function addQuery<Entity extends BaseEntity>(
  queryBuilder: SelectQueryBuilder<Entity>,
  where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
  query: PaginationDto,
) {
  const whereKeys = Object.keys(where);
  const queryKeys = Object.keys(query);
  const queryRecord = query as Record<string, unknown>;
  queryKeys.forEach((key) => {
    const value = String(queryRecord[key] ?? '');
    const queryObjects = key.split('.');
    let queryString = `entity.${key} LIKE '%${value}%'`;
    let whereMethod = 'andWhere';
    if (whereKeys.length === 0) {
      whereMethod = 'where';
    }
    if (queryObjects.length > 1) {
      queryString = `${key} LIKE '%${value}%'`;
    }
    queryBuilder[whereMethod](queryString);
  });
  return queryBuilder;
}

import { FindOptionsRelations } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * Convert dot-notation relation paths into TypeORM's object relation tree.
 * TypeORM 1.0 dropped the `string[]` form for find `relations`, so the
 * variadic string API exposed by BaseService is normalized here.
 *
 * `['user', 'posts.comments']` -> `{ user: true, posts: { comments: true } }`
 */
export function toFindOptionsRelations<Entity extends BaseEntity>(
  relations: readonly string[],
): FindOptionsRelations<Entity> {
  const tree: Record<string, unknown> = {};

  for (const path of relations) {
    const segments = path.split('.');
    let cursor = tree;

    segments.forEach((segment, index) => {
      const isLeaf = index === segments.length - 1;
      if (isLeaf) {
        cursor[segment] = cursor[segment] ?? true;
        return;
      }
      if (cursor[segment] === undefined || cursor[segment] === true) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    });
  }

  // reason: the relation tree is built dynamically from arbitrary string paths,
  // which the FindOptionsRelations mapped type cannot express statically.
  return tree as FindOptionsRelations<Entity>;
}

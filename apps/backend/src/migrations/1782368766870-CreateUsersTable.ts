import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1782368766870 implements MigrationInterface {
  name = 'CreateUsersTable1782368766870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'SELLER')`,
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "email" character varying(255) NOT NULL,
        "avatar" character varying(255),
        "balance" integer NOT NULL DEFAULT 0,
        "token" integer NOT NULL DEFAULT 0,
        "password" character varying(255) NOT NULL,
        "is_email_verified" boolean NOT NULL DEFAULT false,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER',
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "fulltext_index" ON "users" ("email")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}

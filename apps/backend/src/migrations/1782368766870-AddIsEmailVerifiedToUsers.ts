import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsEmailVerifiedToUsers1782368766870 implements MigrationInterface {
  name = 'AddIsEmailVerifiedToUsers1782368766870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');

    if (!hasUsersTable) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
            CREATE TYPE "public"."users_role_enum" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'SELLER');
          END IF;
        END
        $$;
      `);

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

      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "fulltext_index" ON "users" ("email")`);

      return;
    }

    const hasEmailVerifiedColumn = await queryRunner.hasColumn('users', 'is_email_verified');

    if (!hasEmailVerifiedColumn) {
      await queryRunner.query(
        `ALTER TABLE "users" ADD "is_email_verified" boolean NOT NULL DEFAULT false`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsersTable = await queryRunner.hasTable('users');

    if (!hasUsersTable) return;

    const hasEmailVerifiedColumn = await queryRunner.hasColumn('users', 'is_email_verified');

    if (hasEmailVerifiedColumn) {
      await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_email_verified"`);
    }
  }
}

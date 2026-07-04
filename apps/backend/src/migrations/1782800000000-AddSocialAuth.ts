import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSocialAuth1782800000000 implements MigrationInterface {
  name = 'AddSocialAuth1782800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_sessions" ADD "auth_provider" character varying(40) NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(`
      CREATE TABLE "auth_identities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "provider" character varying(40) NOT NULL,
        "provider_account_id" character varying(255) NOT NULL,
        "email" character varying(255),
        "email_verified" boolean NOT NULL DEFAULT false,
        "display_name" character varying(255),
        "avatar" character varying(512),
        "metadata" jsonb,
        CONSTRAINT "PK_auth_identities_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_identity_provider_account" UNIQUE ("provider", "provider_account_id"),
        CONSTRAINT "FK_auth_identities_user" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_auth_identities_user" ON "auth_identities" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_identities_user"`);
    await queryRunner.query(`DROP TABLE "auth_identities"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "auth_provider"`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserSessionsTable1782558632108 implements MigrationInterface {
  name = 'CreateUserSessionsTable1782558632108';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "jti" uuid NOT NULL,
        "ip_address" character varying(255),
        "user_agent" text,
        "browser_name" character varying(120),
        "os_name" character varying(120),
        "device_type" character varying(80),
        "remember_me" boolean NOT NULL DEFAULT false,
        "last_seen_at" TIMESTAMP,
        "expires_at" TIMESTAMP NOT NULL,
        "revoked_at" TIMESTAMP,
        "revoke_reason" character varying(120),
        CONSTRAINT "UQ_user_sessions_jti" UNIQUE ("jti"),
        CONSTRAINT "PK_user_sessions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sessions_user_revoked" ON "user_sessions" ("user_id", "revoked_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_user_sessions_user_expires" ON "user_sessions" ("user_id", "expires_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_user_sessions_user_expires"`);
    await queryRunner.query(`DROP INDEX "IDX_user_sessions_user_revoked"`);
    await queryRunner.query(`DROP TABLE "user_sessions"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTwoFactorTables1785923568332 implements MigrationInterface {
  name = 'AddTwoFactorTables1785923568332';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_totp" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "secret" text NOT NULL,
        "confirmed_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_user_totp" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_totp_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    // One enrolment per user: a second row would leave it ambiguous which secret is authoritative.
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_totp_user_id" ON "user_totp" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_recovery_codes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP,
        "user_id" uuid NOT NULL,
        "code_hash" text NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_user_recovery_codes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_recovery_codes_user_id" FOREIGN KEY ("user_id")
          REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_recovery_codes_user_id" ON "user_recovery_codes" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_recovery_codes"`);
    await queryRunner.query(`DROP TABLE "user_totp"`);
  }
}

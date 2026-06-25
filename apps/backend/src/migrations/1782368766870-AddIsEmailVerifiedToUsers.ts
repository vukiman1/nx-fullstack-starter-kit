import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsEmailVerifiedToUsers1782368766870 implements MigrationInterface {
  name = 'AddIsEmailVerifiedToUsers1782368766870';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_email_verified" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_email_verified"`);
  }
}

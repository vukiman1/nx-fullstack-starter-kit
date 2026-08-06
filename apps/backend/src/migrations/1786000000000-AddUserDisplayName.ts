import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserDisplayName1786000000000 implements MigrationInterface {
  name = 'AddUserDisplayName1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Nullable: existing accounts have no name, and Google sign-ups may still arrive without one.
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "display_name" character varying(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "display_name"`);
  }
}

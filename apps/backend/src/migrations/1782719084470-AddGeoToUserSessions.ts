import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeoToUserSessions1782719084470 implements MigrationInterface {
  name = 'AddGeoToUserSessions1782719084470';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_sessions" ADD "country" character varying(2)`);
    await queryRunner.query(`ALTER TABLE "user_sessions" ADD "city" character varying(120)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "city"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "country"`);
  }
}

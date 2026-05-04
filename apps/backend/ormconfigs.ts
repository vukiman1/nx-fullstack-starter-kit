import { DataSource, DataSourceOptions } from 'typeorm';
import configuration from '@app/config';
import { UserEntity } from 'src/api/user/entities/user.entity';

//ok
interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const { host, port, username, password, database } = configuration()
  .database as DatabaseConfig;

const dbConfig: DatabaseConfig = {
  host,
  port: Number(port),
  username,
  password,
  database,
};

export const options: DataSourceOptions = {
  type: 'postgres',
  ...dbConfig,
  entities: [UserEntity],
  migrationsTableName: 'migrations',
  migrations: ['migrations/*.ts'],
  synchronize: false,
};
export const AppDataSource = new DataSource(options);

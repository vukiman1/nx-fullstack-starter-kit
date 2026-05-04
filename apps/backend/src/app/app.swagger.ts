import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import configuration from '@app/config';

interface SwaggerOperation {
  get(key: 'method'): string;
  get(key: 'path'): string;
  get(key: string): unknown;
}

export function useSwagger(app: INestApplication) {
  const logger = new Logger('Swagger');
  const port = configuration().app.port || process.env.PORT || 3000;
  const path = 'docs';
  const config = new DocumentBuilder()
    .setTitle('NestJS Example')
    .setDescription('NestJS Example Documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });
  SwaggerModule.setup(path, app, document, {
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: (a: SwaggerOperation, b: SwaggerOperation) => {
        const methodsOrder = [
          'get',
          'post',
          'put',
          'patch',
          'delete',
          'options',
          'trace',
        ];
        let result =
          methodsOrder.indexOf(a.get('method')) -
          methodsOrder.indexOf(b.get('method'));

        if (result === 0) {
          result = a.get('path').localeCompare(b.get('path'));
        }

        return result;
      },
    },
  });
  logger.log(
    `Your documentation is running on http://localhost:${port}/${path}`,
  );
}

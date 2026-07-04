export interface FrontendPublicConfig {
  app: {
    name: string;
    environment: string;
  };
  api: {
    baseUrl: string;
  };
  sentry: {
    dsn: string;
  };
  google: {
    clientId: string;
  };
}

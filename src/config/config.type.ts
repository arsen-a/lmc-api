export interface Config {
  app: {
    url: string;
    secret: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    name: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    geminiApiKey: string;
  };
  mail: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

export interface Config {
  ai: {
    geminiApiKey: string;
    openaiApiKey: string;
  };
  app: {
    url: string;
    secret: string;
  };
  clientApp: {
    url: string;
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
  };
  mail: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
}

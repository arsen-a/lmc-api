const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;

export default () => ({
  database: {
    host: process.env.DB_HOST,
    port,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
});

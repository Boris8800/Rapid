export const databaseConfig = () => ({
  database: {
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    name: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
  },
});

export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  domain: process.env.DOMAIN,
});

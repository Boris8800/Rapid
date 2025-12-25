export const jwtConfig = () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRATION ?? '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRATION ?? '7d',
  },
});

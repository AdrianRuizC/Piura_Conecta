require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT || 3000),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: Number(process.env.DB_PORT || 5432),
  DB_NAME: process.env.DB_NAME || 'piuraconecta',
  DB_USER: process.env.DB_USER || 'admin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'adminpassword',
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_change_me',
  UPLOADS_DIR: process.env.UPLOADS_DIR || 'uploads',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*'
};

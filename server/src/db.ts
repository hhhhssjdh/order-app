// 在模块加载时组装 DATABASE_URL（云托管环境变量）
function buildDatabaseUrl(): string {
  // 如果已有完整 DATABASE_URL 直接用
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // 云托管提供 MYSQL_ADDRESS / MYSQL_USERNAME / MYSQL_PASSWORD
  const { MYSQL_ADDRESS = 'localhost:3306', MYSQL_USERNAME = 'root', MYSQL_PASSWORD = '', MYSQL_DATABASE = 'order_app' } = process.env;
  const [host, port] = MYSQL_ADDRESS.split(':');
  const user = encodeURIComponent(MYSQL_USERNAME);
  const pass = encodeURIComponent(MYSQL_PASSWORD);
  return `mysql://${user}:${pass}@${host}:${port}/${MYSQL_DATABASE}?connection_limit=5`;
}

process.env.DATABASE_URL = buildDatabaseUrl();

import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

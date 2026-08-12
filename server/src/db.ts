// 数据库连接组装 + 自动建库（适配微信云托管环境变量）
import mysql from 'mysql2/promise';

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

function getDatabaseName(): string {
  if (process.env.DATABASE_URL) {
    const m = process.env.DATABASE_URL.match(/\/([^/?]+)(\?|$)/);
    if (m) return m[1];
  }
  return process.env.MYSQL_DATABASE || 'order_app';
}

// 确保数据库存在（Prisma 不会自动建库）
async function ensureDatabase(): Promise<void> {
  const { MYSQL_ADDRESS = 'localhost:3306', MYSQL_USERNAME = 'root', MYSQL_PASSWORD = '' } = process.env;
  const [host, port] = MYSQL_ADDRESS.split(':');
  const dbName = getDatabaseName();

  // 连接时不指定数据库，先创建数据库
  const conn = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[db] 数据库 ${dbName} 已就绪`);
  } finally {
    await conn.end();
  }
}

process.env.DATABASE_URL = buildDatabaseUrl();

// 启动时自动建库（异步执行，不阻塞模块加载）
ensureDatabase().catch((e) => console.error('[db] 自动建库失败:', e.message));

import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

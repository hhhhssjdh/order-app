// 数据库连接组装 + 自动建库建表（适配微信云托管环境变量）
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

// 建表 SQL（Prisma CLI 无法读取云托管 MYSQL_* 变量，改用 mysql2 直连建表）
const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS \`Category\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(191) NOT NULL,
  \`sort\` INTEGER NOT NULL DEFAULT 0,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`Category_name_key\`(\`name\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Dish\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`name\` VARCHAR(191) NOT NULL,
  \`difficulty\` INTEGER NOT NULL DEFAULT 1,
  \`duration\` INTEGER NOT NULL DEFAULT 0,
  \`description\` VARCHAR(191) NOT NULL DEFAULT '',
  \`image\` VARCHAR(191) NOT NULL DEFAULT '',
  \`status\` VARCHAR(191) NOT NULL DEFAULT 'ENABLED',
  \`sort\` INTEGER NOT NULL DEFAULT 0,
  \`categoryId\` INTEGER NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`PhoneWhitelist\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`phone\` VARCHAR(191) NOT NULL,
  \`name\` VARCHAR(191) NOT NULL DEFAULT '',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`PhoneWhitelist_phone_key\`(\`phone\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS \`Order\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`tableNo\` VARCHAR(191) NOT NULL,
  \`items\` VARCHAR(191) NOT NULL,
  \`totalPrice\` DOUBLE NOT NULL,
  \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  \`note\` VARCHAR(191) NOT NULL DEFAULT '',
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE \`Dish\` ADD CONSTRAINT \`Dish_categoryId_fkey\` FOREIGN KEY (\`categoryId\`) REFERENCES \`Category\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
`;

// 初始化数据库：建库 + 建表（幂等）
export async function initDatabase(): Promise<void> {
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

  // 连接目标数据库建表（CREATE TABLE IF NOT EXISTS 幂等）
  const dbConn = await mysql.createConnection({
    host,
    port: parseInt(port, 10),
    user: MYSQL_USERNAME,
    password: MYSQL_PASSWORD,
    database: dbName,
    multipleStatements: true,
  });
  try {
    await dbConn.query(CREATE_TABLES_SQL);
    console.log('[db] 数据表已就绪');
  } finally {
    await dbConn.end();
  }
}

process.env.DATABASE_URL = buildDatabaseUrl();

import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

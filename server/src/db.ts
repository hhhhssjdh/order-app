// 数据库连接层：使用 mysql2 连接池（替代 Prisma，兼容微信云托管环境）
import mysql from 'mysql2/promise';

// 在模块加载时组装连接配置（云托管环境变量）
function getMysqlConfig() {
  const { MYSQL_ADDRESS = 'localhost:3306', MYSQL_USERNAME = 'root', MYSQL_PASSWORD = '', MYSQL_DATABASE = 'order_app' } = process.env;
  const [host, port] = MYSQL_ADDRESS.split(':');
  return { host, port: parseInt(port, 10), user: MYSQL_USERNAME, password: MYSQL_PASSWORD, database: MYSQL_DATABASE };
}

function getDatabaseName(): string {
  return process.env.MYSQL_DATABASE || 'order_app';
}

// 建表 SQL（CREATE TABLE IF NOT EXISTS 幂等）
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
  \`items\` MEDIUMTEXT NOT NULL,
  \`totalPrice\` DOUBLE NOT NULL,
  \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
  \`note\` MEDIUMTEXT NOT NULL,
  \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 兼容已存在的旧表（VARCHAR(191) → MEDIUMTEXT，幂等）
ALTER TABLE \`Order\` MODIFY \`items\` MEDIUMTEXT NOT NULL, MODIFY \`note\` MEDIUMTEXT NOT NULL;
`;

// 初始化数据库：建库 + 建表（幂等，mysql2 直连，不依赖 Prisma CLI）
export async function initDatabase(): Promise<void> {
  const { host, port, user, password } = getMysqlConfig();
  const dbName = getDatabaseName();

  // 1. 连接时不指定数据库，先创建数据库
  const conn = await mysql.createConnection({ host, port, user, password });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    console.log(`[db] 数据库 ${dbName} 已就绪`);
  } finally {
    await conn.end();
  }

  // 2. 连接目标数据库建表
  const dbConn = await mysql.createConnection({ host, port, user, password, database: dbName, multipleStatements: true });
  try {
    await dbConn.query(CREATE_TABLES_SQL);
    console.log('[db] 数据表已就绪');
  } finally {
    await dbConn.end();
  }
}

// 连接池（应用运行时统一使用）
let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    const { host, port, user, password, database } = getMysqlConfig();
    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 5,
      waitForConnections: true,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

// 便捷查询助手
export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T;
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T[]>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await getPool().execute(sql, params);
  return result as mysql.ResultSetHeader;
}

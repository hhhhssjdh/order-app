import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth';
import { initDatabase, query } from './db';
import { seedData } from './seed';
import authRouter from './controllers/auth';
import categoryRouter from './controllers/category';
import dishRouter from './controllers/dish';
import orderRouter from './controllers/order';
import whitelistRouter from './controllers/whitelist';
import uploadRouter from './controllers/upload';

const app = express();
// 云托管不注入 PORT，约定 80；本地开发默认 3001
const PORT = parseInt(process.env.PORT || (process.env.NODE_ENV === 'production' ? '80' : '3001'), 10);

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - uploads 目录
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 认证中间件（保护 /api/* 路由）
app.use('/api', authMiddleware);

// 路由挂载
app.use('/api/auth', authRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/dishes', dishRouter);
app.use('/api/orders', orderRouter);
app.use('/api/whitelist', whitelistRouter);
app.use('/api/upload', uploadRouter);

// 静态托管前端构建产物（微信云托管单容器部署）
const clientDist = path.join(__dirname, '../../client/dist');
const adminDist = path.join(__dirname, '../../admin/dist');

// 后台管理 - /admin 前缀（放在前台 fallback 之前）
if (fs.existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
}

// 前台点餐 - 根路径
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    if (req.path.startsWith('/admin')) {
      return res.sendFile(path.join(adminDist, 'index.html'));
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 启动服务：先建库建表，无数据则自动初始化种子数据
async function bootstrap() {
  // 云托管 MySQL 可能自动暂停（冷启动唤醒需要时间），重试连接
  const MAX_RETRY = 10;
  let lastError: string = '';

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    try {
      // 等待建库建表完成（幂等）
      await initDatabase();
      lastError = '';
      break;
    } catch (e: any) {
      lastError = e?.message || JSON.stringify(e) || '未知错误';
      console.error(`[db] 初始化第 ${attempt}/${MAX_RETRY} 次失败:`, lastError);
      if (attempt < MAX_RETRY) {
        await new Promise(r => setTimeout(r, 3000)); // 等3秒重试
      }
    }
  }

  if (lastError) {
    console.error('[db] 数据库初始化失败，请检查 MYSQL_* 环境变量和网络:', lastError);
    // 数据库不可用也启动服务，避免健康检查一直失败（页面可见，API 会报错）
  } else {
    try {
      // 检查是否有数据
      const rows = await query('SELECT COUNT(*) as cnt FROM Category').catch(() => null);
      const categoryCount = rows ? Number((rows as any[])[0]?.cnt ?? 0) : -1;
      if (categoryCount === -1) {
        console.log('[init] 表结构未就绪，跳过自动初始化');
      } else if (categoryCount === 0) {
        console.log('[init] 数据库为空，自动初始化种子数据...');
        await seedData();
      } else {
        console.log(`[init] 数据已存在 (${categoryCount} 个分类)，跳过初始化`);
      }
    } catch (e: any) {
      console.error('[init] 种子数据初始化失败:', e?.message || e);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap();

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from './middleware/auth';
import authRouter from './controllers/auth';
import categoryRouter from './controllers/category';
import dishRouter from './controllers/dish';
import orderRouter from './controllers/order';
import whitelistRouter from './controllers/whitelist';
import uploadRouter from './controllers/upload';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

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

// 启动服务
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'order-app-secret-key-change-in-production';

// 公开路径列表，不需要认证（中间件挂载在 /api 下，req.path 不包含 /api 前缀）
const publicPaths: { method: string; pattern: RegExp }[] = [
  { method: 'POST', pattern: /^\/auth\/login$/ },
  { method: 'GET', pattern: /^\/categories\/?$/ },
  { method: 'GET', pattern: /^\/categories\/\d+$/ },
  { method: 'GET', pattern: /^\/dishes\/?$/ },
  { method: 'GET', pattern: /^\/dishes\/\d+$/ },
  { method: 'POST', pattern: /^\/orders\/?$/ },
  { method: 'GET', pattern: /^\/orders\/\d+$/ },
  { method: 'POST', pattern: /^\/auth\/phone-login$/ },
  { method: 'POST', pattern: /^\/auth\/merchant-login$/ },
];

function isPublicPath(method: string, path: string): boolean {
  return publicPaths.some(p => p.method === method && p.pattern.test(path));
}

export interface AuthRequest extends Request {
  user?: { role: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  // 跳过公开路径
  if (isPublicPath(req.method, req.path)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '认证令牌无效或已过期' });
  }
}

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { queryOne } from '../db';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'order-app-secret-key-change-in-production';

const loginSchema = z.object({
  password: z.string().min(1, '密码不能为空'),
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  const { password } = result.data;
  if (password !== 'admin123') {
    return res.status(401).json({ error: '密码错误' });
  }

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// POST /api/auth/phone-login
router.post('/phone-login', async (req: Request, res: Response) => {
  const schema = z.object({ phone: z.string().regex(/^1\d{10}$/) });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: '手机号格式不正确' });
  
  const { phone } = result.data;
  const whitelisted = await queryOne<any>('SELECT * FROM PhoneWhitelist WHERE phone = ?', [phone]);
  if (!whitelisted) return res.status(403).json({ error: '该手机号未被授权' });
  
  const token = jwt.sign({ role: 'user', phone }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { phone, name: whitelisted.name } });
});

// POST /api/auth/merchant-login — 商家手机号登录（硬编码）
router.post('/merchant-login', async (req: Request, res: Response) => {
  const schema = z.object({ phone: z.string().regex(/^1\d{10}$/) });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: '手机号格式不正确' });

  const { phone } = result.data;
  if (phone !== '18977524719') return res.status(403).json({ error: '非商家账号' });

  const token = jwt.sign({ role: 'merchant', phone }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { phone, name: '商家' } });
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  name: z.string().optional().default(''),
});

// GET /api/whitelist - 获取所有白名单
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const list = await prisma.phoneWhitelist.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: '获取白名单失败' });
  }
});

// POST /api/whitelist - 添加白名单
router.post('/', async (req: AuthRequest, res: Response) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  try {
    const item = await prisma.phoneWhitelist.create({ data: result.data });
    res.status(201).json(item);
  } catch (e: any) {
    if (e.code === 'P2002') return res.status(409).json({ error: '该手机号已存在' });
    res.status(500).json({ error: '添加失败' });
  }
});

// DELETE /api/whitelist/:id - 删除白名单
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: '无效ID' });
  try {
    await prisma.phoneWhitelist.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch { res.status(404).json({ error: '不存在' }); }
});

export default router;

import { Router, Response } from 'express';
import { z } from 'zod';
import { query, execute } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const createSchema = z.object({
  phone: z.string().regex(/^1\d{10}$/, '手机号格式不正确'),
  name: z.string().optional().default(''),
});

// GET /api/whitelist - 获取所有白名单
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const list = await query<any[]>('SELECT * FROM PhoneWhitelist ORDER BY createdAt DESC');
    res.json(list || []);
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
    const r = await execute('INSERT INTO PhoneWhitelist (phone, name) VALUES (?, ?)', [
      result.data.phone,
      result.data.name,
    ]);
    res.status(201).json({
      id: r.insertId,
      phone: result.data.phone,
      name: result.data.name,
      createdAt: new Date(),
    });
  } catch (e: any) {
    if (e?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: '该手机号已存在' });
    res.status(500).json({ error: '添加失败' });
  }
});

// DELETE /api/whitelist/:id - 删除白名单
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: '无效ID' });
  try {
    const r = await execute('DELETE FROM PhoneWhitelist WHERE id = ?', [id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: '不存在' });
    res.json({ message: '删除成功' });
  } catch {
    res.status(404).json({ error: '不存在' });
  }
});

export default router;

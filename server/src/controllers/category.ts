import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空'),
  sort: z.number().int().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').optional(),
  sort: z.number().int().optional(),
});

// GET /api/categories - 获取所有分类（含菜品数量）
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await query<any[]>(
      `SELECT c.*, COUNT(d.id) as dishCount
       FROM Category c
       LEFT JOIN Dish d ON d.categoryId = c.id
       GROUP BY c.id
       ORDER BY c.sort ASC`
    );
    // 兼容前端 _count 结构：保留 _count: { dishes }，删除原始 dishCount 字段
    const result = (categories || []).map(c => {
      const { dishCount, ...rest } = c;
      return { ...rest, _count: { dishes: Number(dishCount) } };
    });
    res.json(result);
  } catch (error: any) {
    console.error('获取分类失败:', error);
    res.status(500).json({ error: '获取分类失败', detail: error?.message || String(error) });
  }
});

// POST /api/categories - 创建分类
router.post('/', async (req: AuthRequest, res: Response) => {
  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const r = await execute('INSERT INTO Category (name, sort) VALUES (?, ?)', [
      result.data.name,
      result.data.sort ?? 0,
    ]);
    const id = r.insertId;
    res.status(201).json({ id, name: result.data.name, sort: result.data.sort ?? 0, createdAt: new Date() });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '分类名称已存在' });
    }
    console.error('创建分类失败:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// PUT /api/categories/:id - 更新分类
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  const result = updateCategorySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const existing = await queryOne('SELECT id FROM Category WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const sets: string[] = [];
    const params: any[] = [];
    if (result.data.name !== undefined) {
      sets.push('name = ?');
      params.push(result.data.name);
    }
    if (result.data.sort !== undefined) {
      sets.push('sort = ?');
      params.push(result.data.sort);
    }
    if (sets.length === 0) return res.json({ id });

    params.push(id);
    await execute(`UPDATE Category SET ${sets.join(', ')} WHERE id = ?`, params);
    res.json({ id, ...result.data });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '分类名称已存在' });
    }
    console.error('更新分类失败:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// DELETE /api/categories/:id - 删除分类
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  try {
    // 检查是否有菜品关联
    const row = await queryOne<any>('SELECT COUNT(*) as cnt FROM Dish WHERE categoryId = ?', [id]);
    const dishCount = Number(row?.cnt ?? 0);
    if (dishCount > 0) {
      return res.status(409).json({ error: '该分类下有关联菜品，无法删除', dishCount });
    }

    const r = await execute('DELETE FROM Category WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: '分类不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

export default router;

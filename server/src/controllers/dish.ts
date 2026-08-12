import { Router, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, execute } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const createDishSchema = z.object({
  name: z.string().min(1, '菜品名称不能为空'),
  difficulty: z.number().int('难度必须是整数').min(1, '难度最低1星').max(5, '难度最高5星'),
  duration: z.number().int('时长必须是整数').min(0, '时长不能为负').optional().default(0),
  description: z.string().optional().default(''),
  image: z.string().optional().default(''),
  categoryId: z.number().int('分类ID必须是整数'),
  sort: z.number().int().optional().default(0),
});

const updateDishSchema = z.object({
  name: z.string().min(1, '菜品名称不能为空').optional(),
  difficulty: z.number().int('难度必须是整数').min(1, '难度最低1星').max(5, '难度最高5星').optional(),
  duration: z.number().int('时长必须是整数').min(0, '时长不能为负').optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.number().int('分类ID必须是整数').optional(),
  sort: z.number().int().optional(),
});

const statusSchema = z.object({
  status: z.enum(['ENABLED', 'DISABLED'], { message: '状态必须为 ENABLED 或 DISABLED' }),
});

// 将行的 categoryName 字段转换为嵌套 category 结构（兼容 Prisma 返回格式）
function formatDish(dish: any) {
  const { categoryName, ...rest } = dish;
  return {
    ...rest,
    category: categoryName ? { id: rest.categoryId, name: categoryName } : null,
  };
}

const DISH_SELECT_SQL = `SELECT d.*, c.name as categoryName FROM Dish d LEFT JOIN Category c ON c.id = d.categoryId`;

// GET /api/dishes - 获取菜品列表
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, status } = req.query;
    let sql = DISH_SELECT_SQL;
    const where: string[] = [];
    const params: any[] = [];

    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (!isNaN(catId)) {
        where.push('d.categoryId = ?');
        params.push(catId);
      }
    }

    if (status && (status === 'ENABLED' || status === 'DISABLED')) {
      where.push('d.status = ?');
      params.push(status as string);
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY d.sort ASC, d.id ASC';

    const dishes = await query<any[]>(sql, params);
    res.json((dishes || []).map(formatDish));
  } catch (error) {
    console.error('获取菜品列表失败:', error);
    res.status(500).json({ error: '获取菜品列表失败' });
  }
});

// GET /api/dishes/:id - 获取单个菜品
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  try {
    const dish = await queryOne<any>(`${DISH_SELECT_SQL} WHERE d.id = ?`, [id]);
    if (!dish) {
      return res.status(404).json({ error: '菜品不存在' });
    }
    res.json(formatDish(dish));
  } catch (error) {
    console.error('获取菜品失败:', error);
    res.status(500).json({ error: '获取菜品失败' });
  }
});

// POST /api/dishes - 创建菜品
router.post('/', async (req: AuthRequest, res: Response) => {
  const result = createDishSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    // 验证分类存在
    const category = await queryOne('SELECT id FROM Category WHERE id = ?', [result.data.categoryId]);
    if (!category) {
      return res.status(400).json({ error: '分类不存在' });
    }

    const r = await execute(
      'INSERT INTO Dish (name, difficulty, duration, description, image, status, sort, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        result.data.name,
        result.data.difficulty,
        result.data.duration,
        result.data.description,
        result.data.image,
        'ENABLED',
        result.data.sort,
        result.data.categoryId,
      ]
    );
    const dish = await queryOne<any>(`${DISH_SELECT_SQL} WHERE d.id = ?`, [r.insertId]);
    res.status(201).json(formatDish(dish));
  } catch (error) {
    console.error('创建菜品失败:', error);
    res.status(500).json({ error: '创建菜品失败' });
  }
});

// PUT /api/dishes/:id - 更新菜品
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  const result = updateDishSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const existing = await queryOne('SELECT id FROM Dish WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: '菜品不存在' });
    }

    if (result.data.categoryId !== undefined) {
      const category = await queryOne('SELECT id FROM Category WHERE id = ?', [result.data.categoryId]);
      if (!category) {
        return res.status(400).json({ error: '分类不存在' });
      }
    }

    const sets: string[] = [];
    const params: any[] = [];
    if (result.data.name !== undefined) {
      sets.push('name = ?');
      params.push(result.data.name);
    }
    if (result.data.difficulty !== undefined) {
      sets.push('difficulty = ?');
      params.push(result.data.difficulty);
    }
    if (result.data.duration !== undefined) {
      sets.push('duration = ?');
      params.push(result.data.duration);
    }
    if (result.data.description !== undefined) {
      sets.push('description = ?');
      params.push(result.data.description);
    }
    if (result.data.image !== undefined) {
      sets.push('image = ?');
      params.push(result.data.image);
    }
    if (result.data.categoryId !== undefined) {
      sets.push('categoryId = ?');
      params.push(result.data.categoryId);
    }
    if (result.data.sort !== undefined) {
      sets.push('sort = ?');
      params.push(result.data.sort);
    }

    if (sets.length > 0) {
      params.push(id);
      await execute(`UPDATE Dish SET ${sets.join(', ')} WHERE id = ?`, params);
    }

    const dish = await queryOne<any>(`${DISH_SELECT_SQL} WHERE d.id = ?`, [id]);
    res.json(formatDish(dish));
  } catch (error: any) {
    console.error('更新菜品失败:', error);
    res.status(500).json({ error: '更新菜品失败' });
  }
});

// PATCH /api/dishes/:id/status - 上下架
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  const result = statusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const r = await execute('UPDATE Dish SET status = ? WHERE id = ?', [result.data.status, id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: '菜品不存在' });
    }
    const dish = await queryOne<any>(`${DISH_SELECT_SQL} WHERE d.id = ?`, [id]);
    res.json(formatDish(dish));
  } catch (error: any) {
    console.error('更新菜品状态失败:', error);
    res.status(500).json({ error: '更新菜品状态失败' });
  }
});

// DELETE /api/dishes/:id - 删除菜品
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  try {
    const r = await execute('DELETE FROM Dish WHERE id = ?', [id]);
    if (r.affectedRows === 0) {
      return res.status(404).json({ error: '菜品不存在' });
    }
    res.json({ message: '删除成功' });
  } catch (error: any) {
    console.error('删除菜品失败:', error);
    res.status(500).json({ error: '删除菜品失败' });
  }
});

export default router;

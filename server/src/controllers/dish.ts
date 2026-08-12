import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
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

// GET /api/dishes - 获取菜品列表
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId, status } = req.query;
    const where: any = {};

    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (!isNaN(catId)) {
        where.categoryId = catId;
      }
    }

    if (status && (status === 'ENABLED' || status === 'DISABLED')) {
      where.status = status as string;
    }

    const dishes = await prisma.dish.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'asc' }],
      include: { category: { select: { id: true, name: true } } },
    });
    res.json(dishes);
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
    const dish = await prisma.dish.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!dish) {
      return res.status(404).json({ error: '菜品不存在' });
    }
    res.json(dish);
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
    const category = await prisma.category.findUnique({ where: { id: result.data.categoryId } });
    if (!category) {
      return res.status(400).json({ error: '分类不存在' });
    }

    const dish = await prisma.dish.create({ data: result.data });
    res.status(201).json(dish);
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
    if (result.data.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: result.data.categoryId } });
      if (!category) {
        return res.status(400).json({ error: '分类不存在' });
      }
    }

    const dish = await prisma.dish.update({
      where: { id },
      data: result.data,
    });
    res.json(dish);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '菜品不存在' });
    }
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
    const dish = await prisma.dish.update({
      where: { id },
      data: { status: result.data.status },
    });
    res.json(dish);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '菜品不存在' });
    }
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
    await prisma.dish.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '菜品不存在' });
    }
    console.error('删除菜品失败:', error);
    res.status(500).json({ error: '删除菜品失败' });
  }
});

export default router;

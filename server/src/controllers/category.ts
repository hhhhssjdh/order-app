import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
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

// GET /api/categories - 获取所有分类
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sort: 'asc' },
      include: { _count: { select: { dishes: true } } },
    });
    res.json(categories);
  } catch (error) {
    console.error('获取分类失败:', error);
    res.status(500).json({ error: '获取分类失败' });
  }
});

// POST /api/categories - 创建分类
router.post('/', async (req: AuthRequest, res: Response) => {
  const result = createCategorySchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const category = await prisma.category.create({ data: result.data });
    res.status(201).json(category);
  } catch (error: any) {
    if (error.code === 'P2002') {
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
    const category = await prisma.category.update({
      where: { id },
      data: result.data,
    });
    res.json(category);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '分类不存在' });
    }
    if (error.code === 'P2002') {
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
    const dishCount = await prisma.dish.count({ where: { categoryId: id } });
    if (dishCount > 0) {
      return res.status(409).json({ error: '该分类下有关联菜品，无法删除', dishCount });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '分类不存在' });
    }
    console.error('删除分类失败:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

export default router;

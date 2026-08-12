import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

const orderItemSchema = z.object({
  dishId: z.number().int('菜品ID必须是整数'),
  quantity: z.number().int('数量必须是整数').positive('数量必须大于0'),
});

const createOrderSchema = z.object({
  tableNo: z.union([z.string(), z.number()]).transform(v => String(v)).optional().default(''),
  items: z.array(orderItemSchema).min(1, '至少需要一个菜品'),
  note: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'], {
    message: '状态无效',
  }),
});

// POST /api/orders - 创建订单
router.post('/', async (req: AuthRequest, res: Response) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  const { tableNo, items, note } = result.data;

  try {
    // 查询所有菜品当前价格
    const dishIds = items.map(item => item.dishId);
    const dishes = await prisma.dish.findMany({
      where: { id: { in: dishIds } },
    });

    // 检查所有菜品是否存在
    if (dishes.length !== dishIds.length) {
      const foundIds = dishes.map(d => d.id);
      const missingIds = dishIds.filter(id => !foundIds.includes(id));
      return res.status(400).json({ error: '部分菜品不存在', missingIds });
    }

    // 构建订单 items 数据（包含难度和时长快照）
    const dishMap = new Map(dishes.map(d => [d.id, d]));
    const orderItems = items.map(item => {
      const dish = dishMap.get(item.dishId)!;
      return {
        dishId: item.dishId,
        name: dish.name,
        difficulty: dish.difficulty,
        duration: dish.duration,
        quantity: item.quantity,
      };
    });

    // 计算总难度和总时长（不考虑付款）
    const totalDifficulty = orderItems.reduce((sum, item) => sum + item.difficulty * item.quantity, 0);
    const totalDuration = orderItems.reduce((sum, item) => sum + item.duration * item.quantity, 0);

    const order = await prisma.order.create({
      data: {
        tableNo,
        items: JSON.stringify(orderItems),
        totalPrice: totalDifficulty,  // totalPrice 字段复用为总难度
        note,
        status: 'PENDING',
      },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// GET /api/orders - 获取所有订单
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    // 返回时解析 items JSON
    const parsed = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items),
    }));
    res.json(parsed);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// GET /api/orders/:id - 获取单个订单（公开，供顾客查询）
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: '无效的ID' });

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json({ ...order, items: JSON.parse(order.items) });
  } catch (error) {
    console.error('获取订单失败:', error);
    res.status(500).json({ error: '获取订单失败' });
  }
});

// PATCH /api/orders/:id/status - 更新订单状态
router.patch('/:id/status', async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: '无效的ID' });
  }

  const result = updateStatusSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: '请求参数错误', details: result.error.issues });
  }

  try {
    const order = await prisma.order.update({
      where: { id },
      data: { status: result.data.status },
    });
    res.json(order);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '订单不存在' });
    }
    console.error('更新订单状态失败:', error);
    res.status(500).json({ error: '更新订单状态失败' });
  }
});

export default router;

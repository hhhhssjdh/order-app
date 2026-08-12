import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

interface OrderItem {
  dishId: number;
  name: string;
  difficulty: number;
  duration: number;
  quantity: number;
}

interface Order {
  id: number;
  tableNo: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
  note: string;
  createdAt: string;
}

const STATUS_STEPS = [
  { key: 'PENDING', label: '待处理' },
  { key: 'PREPARING', label: '制作中' },
  { key: 'COMPLETED', label: '已完成' },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-500',
  PREPARING: 'bg-orange-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => navigate('/customer/menu'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // Auto refresh every 15s
  useEffect(() => {
    if (!order) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get(`/orders/${id}`);
        setOrder(res.data);
      } catch {
        /* ignore */
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [id, order?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  const avgDifficulty = Math.min(
    5,
    Math.round(
      order.items.reduce((s, i) => s + i.difficulty * i.quantity, 0) /
        order.items.reduce((s, i) => s + i.quantity, 0)
    )
  );
  const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            onClick={() => navigate('/customer/menu')}
            className="w-9 h-9 flex items-center justify-center active:scale-90"
          >
            <svg
              className="w-6 h-6 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-800">订单详情</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {/* Status progress */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between relative">
            {/* Connecting line (gray background) */}
            <div className="absolute top-4 left-[calc(16.67%+8px)] right-[calc(16.67%+8px)] h-0.5 bg-gray-200 -translate-y-1/2" />
            {/* Progress line (green overlay) */}
            <div
              className="absolute top-4 h-0.5 bg-green-500 -translate-y-1/2 transition-all duration-500"
              style={{
                left: 'calc(16.67% + 8px)',
                right:
                  currentStepIdx < 1
                    ? 'calc(83.33% - 8px)'   // PENDING: 0 width
                    : currentStepIdx < 2
                    ? 'calc(50% + 8px)'       // PREPARING: 到第二个圆
                    : 'calc(16.67% + 8px)',   // COMPLETED: 到第三个圆
              }}
            />

            {STATUS_STEPS.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center flex-1 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold transition-colors duration-300 ${
                    idx <= currentStepIdx ? STATUS_COLORS[step.key] : 'bg-gray-200'
                  }`}
                >
                  {idx < currentStepIdx ? '✓' : idx + 1}
                </div>
                <p
                  className={`text-xs mt-1.5 ${
                    idx <= currentStepIdx ? 'text-gray-700 font-medium' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            ))}
          </div>
          {order.status === 'CANCELLED' && (
            <p className="text-center text-red-500 text-sm mt-3">订单已取消</p>
          )}
        </div>

        {/* Order info */}
        <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">订单号</span>
            <span className="text-gray-800 font-medium">#{order.id}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-400">下单时间</span>
            <span className="text-gray-800 font-medium">
              {new Date(order.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50 font-medium text-gray-800 text-sm">
            菜品明细
          </div>
          <div className="px-4 py-2 space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-1.5">
                <div className="flex-1">
                  <p className="text-sm text-gray-800">
                    <span className="text-gray-400 mr-1">×{item.quantity}</span>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {'★'.repeat(item.difficulty)}
                    {'☆'.repeat(5 - item.difficulty)} {item.duration}分钟
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-gray-50 flex justify-between">
            <span className="text-sm text-gray-500">合计</span>
            <span className="text-sm font-bold text-orange-600">
              难度 {'★'.repeat(avgDifficulty)} · 共{totalItems}道
            </span>
          </div>
        </div>

        {order.note && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">备注</p>
            <p className="text-sm text-gray-700">{order.note}</p>
          </div>
        )}

        {/* Back to menu */}
        <button
          onClick={() => navigate('/customer/menu')}
          className="w-full py-3 bg-orange-600 text-white font-medium rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200"
        >
          返回菜单
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useCartStore from '../store/cart';

interface CreatedOrder {
  id: number;
  tableNo: string;
  status: string;
  items: { dishId: number; name: string; difficulty: number; duration: number; quantity: number }[];
  totalPrice: number;
  note: string;
  createdAt: string;
}

export default function OrderConfirm() {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const totalDifficulty = useCartStore((s) => s.totalDifficulty);
  const totalDuration = useCartStore((s) => s.totalDuration);
  const clearCart = useCartStore((s) => s.clearCart);

  // Redirect to login if no token
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/customer/login', { replace: true });
    }
  }, [navigate]);

  // Redirect to menu if cart is empty (and not in success state)
  useEffect(() => {
    if (items.length === 0 && !createdOrder) {
      navigate('/customer/menu', { replace: true });
    }
  }, [items, createdOrder, navigate]);

  // No auto-navigate — user controls navigation via buttons

  const handleSubmit = async () => {
    // Validate
    if (items.length === 0) {
      setError('购物车为空，请先添加菜品');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/orders', {
        items: items.map((item) => ({
          dishId: item.dishId,
          quantity: item.quantity,
        })),
        note: note.trim() || undefined,
      });

      const order: CreatedOrder = res.data;

      // Store order to localStorage myOrders list
      const stored = JSON.parse(localStorage.getItem('myOrders') || '[]');
      stored.unshift({
        id: order.id,
        tableNo: order.tableNo,
        createdAt: order.createdAt,
      });
      localStorage.setItem('myOrders', JSON.stringify(stored.slice(0, 20)));

      setCreatedOrder(order);
      clearCart();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setError(axiosErr.response?.data?.message || '下单失败，请稍后重试');
      } else {
        setError('网络错误，请检查连接后重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Success state — show order summary
  if (createdOrder) {
    const avgDifficulty = Math.min(
      5,
      Math.round(
        createdOrder.items.reduce((s, i) => s + i.difficulty * i.quantity, 0) /
          createdOrder.items.reduce((s, i) => s + i.quantity, 0)
      )
    );
    const totalItems = createdOrder.items.reduce((s, i) => s + i.quantity, 0);
    const totalDurationValue = createdOrder.items.reduce((s, i) => s + i.duration * i.quantity, 0);

    return (
      <div className="min-h-screen bg-[#f8f5f2] pb-8">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-gradient-to-b from-green-600 to-green-500 shadow-lg">
          <div className="flex items-center gap-3 px-5 py-4">
            <h1 className="text-white text-lg font-bold tracking-wide">下单成功</h1>
          </div>
        </header>

        <div className="px-4 pt-5 space-y-3">
          {/* Success badge */}
          <div className="bg-green-50 rounded-2xl p-6 text-center mb-4 shadow-sm">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-xl font-bold text-green-700">下单成功</p>
            <p className="text-gray-500 text-sm mt-1">订单号 #{createdOrder.id}</p>
          </div>

          {/* Order summary card */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">状态</span>
                <span className="text-blue-600 font-medium">待处理</span>
              </div>
            </div>

            {/* Items list */}
            <div className="px-4 py-2 space-y-2">
              {createdOrder.items.map((item, idx) => (
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
                难度 {'★'.repeat(avgDifficulty)} · {totalItems}道 · {totalDurationValue}分钟
              </span>
            </div>
          </div>

          {/* Buttons */}
          <button
            onClick={() => navigate(`/customer/order/${createdOrder.id}`)}
            className="w-full py-3 bg-orange-600 text-white font-medium rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-orange-200"
          >
            查看订单详情
          </button>
          <button
            onClick={() => navigate('/customer/menu')}
            className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl active:scale-[0.98] transition-all"
          >
            返回菜单
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5f2] pb-8">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-orange-600 to-orange-500 shadow-lg">
        <div className="flex items-center gap-1 px-5 py-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-white text-lg font-bold tracking-wide">确认订单</h1>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-4">
        {/* Cart Summary */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">订单明细</h2>
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.dishId} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-sm text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">难度 {'★'.repeat(item.difficulty)} | {item.duration}分钟</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-dashed border-gray-200 mt-3 pt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              <p>总难度: <span className="text-orange-600 font-bold">{'★'.repeat(items.length > 0 ? Math.round(totalDifficulty() / items.reduce((s, i) => s + i.quantity, 0)) : 0)}</span></p>
              <p className="text-xs mt-0.5">总时长: <span className="font-semibold">{totalDuration()}分钟</span></p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            备注 <span className="text-gray-400 font-normal">(选填)</span>
          </label>
          <textarea
            placeholder="口味要求、特殊需求等"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={200}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-800 placeholder-gray-400 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow resize-none"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 animate-[fade-in-up_0.3s_ease-out]">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-2xl text-base font-bold transition-all duration-200 active:scale-[0.98] ${
            submitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-200 hover:shadow-xl'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              提交中...
            </span>
          ) : (
            `提交订单`
          )}
        </button>
      </div>
    </div>
  );
}

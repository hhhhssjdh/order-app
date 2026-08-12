import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

interface OrderSummary {
  id: number;
  tableNo: string;
  createdAt: string;
  status?: string;
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [statusMap, setStatusMap] = useState<Record<number, string>>({});

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('myOrders') || '[]');
    setOrders(stored);
    // Fetch status for each order
    stored.forEach((o: OrderSummary) => {
      api
        .get(`/orders/${o.id}`)
        .then((res) => {
          setStatusMap((prev) => ({ ...prev, [o.id]: res.data.status }));
        })
        .catch(() => {});
    });
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: '待处理',
    PREPARING: '制作中',
    COMPLETED: '已完成',
    CANCELLED: '已取消',
  };
  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-blue-600 bg-blue-50',
    PREPARING: 'text-orange-600 bg-orange-50',
    COMPLETED: 'text-green-600 bg-green-50',
    CANCELLED: 'text-red-600 bg-red-50',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-white shadow-sm sticky top-0 z-30">
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
          <h1 className="text-lg font-bold text-gray-800">我的订单</h1>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p>暂无订单</p>
            <button
              onClick={() => navigate('/customer/menu')}
              className="mt-4 text-orange-600 text-sm font-medium"
            >
              去点餐
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.id}
              onClick={() => navigate(`/customer/order/${order.id}`)}
              className="w-full bg-white rounded-2xl shadow-sm p-4 text-left active:scale-[0.98] transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">订单 #{order.id}</p>
                    <p className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </p>
                </div>
                {statusMap[order.id] && (
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      STATUS_COLORS[statusMap[order.id]] || ''
                    }`}
                  >
                    {STATUS_LABELS[statusMap[order.id]] || '未知'}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

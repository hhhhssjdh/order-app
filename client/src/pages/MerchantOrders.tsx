import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import merchantApi from '../api/merchantApi';

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

const STATUS_CONFIG: Record<
  Order['status'],
  {
    label: string;
    color: string;
    next: 'PREPARING' | 'COMPLETED' | null;
    btnLabel: string;
    btnClass: string;
  }
> = {
  PENDING: {
    label: '待处理',
    color: 'bg-blue-100 text-blue-700',
    next: 'PREPARING',
    btnLabel: '接受订单',
    btnClass: 'bg-blue-600',
  },
  PREPARING: {
    label: '制作中',
    color: 'bg-orange-100 text-orange-700',
    next: 'COMPLETED',
    btnLabel: '完成',
    btnClass: 'bg-orange-600',
  },
  COMPLETED: {
    label: '已完成',
    color: 'bg-green-100 text-green-700',
    next: null,
    btnLabel: '',
    btnClass: '',
  },
  CANCELLED: {
    label: '已取消',
    color: 'bg-red-100 text-red-700',
    next: null,
    btnLabel: '',
    btnClass: '',
  },
};

export default function MerchantOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await merchantApi.get('/orders');
      setOrders(res.data);
    } catch {
      /* handled by interceptor */
    } finally {
      setLoading(false);
    }
  }, []);

  // Redirect if no merchant token
  useEffect(() => {
    const token = localStorage.getItem('merchant_token');
    if (!token) {
      navigate('/merchant/login', { replace: true });
      return;
    }
    fetchOrders();
  }, [navigate, fetchOrders]);

  // Auto refresh every 20 seconds
  useEffect(() => {
    const timer = setInterval(fetchOrders, 20000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const handleStatusUpdate = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      await merchantApi.patch(`/orders/${orderId}/status`, { status: newStatus });
      fetchOrders();
    } catch {
      /* ignore */
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('merchant_token');
    localStorage.removeItem('merchant_user');
    navigate('/merchant/login', { replace: true });
  };

  // Stats
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 bg-gradient-to-b from-blue-700 to-blue-600 shadow-lg">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-xl">
              👨‍🍳
            </div>
            <div>
              <h1 className="text-white text-lg font-bold">订单管理</h1>
              <p className="text-blue-100 text-xs">商家中心</p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Refresh */}
            <button
              onClick={fetchOrders}
              className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-xl text-white active:scale-90 transition-transform"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-9 h-9 flex items-center justify-center bg-white/20 backdrop-blur-sm rounded-xl text-white active:scale-90 transition-transform"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ===== Stats cards ===== */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">待处理</p>
            <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">制作中</p>
            <p className="text-2xl font-bold text-orange-600">{preparingCount}</p>
          </div>
          <div className="flex-1 bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">全部订单</p>
            <p className="text-2xl font-bold text-gray-700">{orders.length}</p>
          </div>
        </div>
      </div>

      {/* ===== Orders list ===== */}
      <div className="px-4 pt-2 space-y-3">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">📋</p>
            <p>暂无订单</p>
          </div>
        ) : (
          orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status];
            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden animate-[fade-in-up_0.3s_ease-out]"
              >
                {/* Card header: tableNo + status tag + time */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-800">
                      订单 #{order.id}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>

                {/* Order items */}
                <div className="px-4 py-3 space-y-1.5">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        <span className="text-gray-400 mr-1">×{item.quantity}</span>
                        {item.name}
                      </span>
                      <span className="text-gray-500 text-xs">
                        难度{'★'.repeat(item.difficulty)} | {item.duration}分
                      </span>
                    </div>
                  ))}
                  {order.note && (
                    <div className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-50">
                      备注: {order.note}
                    </div>
                  )}
                </div>

                {/* Card footer: total price + action */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <span className="text-base font-bold text-gray-800">
                    难度:{' '}
                    <span className="text-orange-600">
                      {'★'.repeat(Math.round(order.totalPrice / (order.items.length || 1)))}
                    </span>
                  </span>

                  {cfg.next ? (
                    <button
                      onClick={() => handleStatusUpdate(order.id, cfg.next!)}
                      disabled={updatingId === order.id}
                      className={`px-5 py-2 ${cfg.btnClass} text-white text-sm font-medium rounded-xl active:scale-95 transition-all disabled:opacity-50`}
                    >
                      {updatingId === order.id ? '...' : cfg.btnLabel}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {order.status === 'COMPLETED' ? '✓ 已完成' : '✕ 已取消'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Custom keyframes */}
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

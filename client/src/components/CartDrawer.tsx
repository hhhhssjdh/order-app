import { useEffect } from 'react';
import useCartStore from '../store/cart';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export default function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalDifficulty = useCartStore((s) => s.totalDifficulty);
  const totalDuration = useCartStore((s) => s.totalDuration);
  const totalCount = useCartStore((s) => s.totalCount);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const count = totalCount();
  const diff = totalDifficulty();
  const dur = totalDuration();

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-[slide-up_0.35s_ease-out] flex flex-col max-h-[65vh]">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            购物车
            {count > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">
                {count} 件商品
              </span>
            )}
          </h2>
          {count > 0 && (
            <button
              onClick={clearCart}
              className="text-sm text-gray-400 active:text-orange-600 transition-colors"
            >
              清空
            </button>
          )}
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <span className="text-5xl mb-3">🛒</span>
              <p className="text-base">购物车是空的</p>
              <p className="text-sm mt-1">快去选几道美味吧</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-2">
              {items.map((item) => (
                <div
                  key={item.dishId}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-orange-600 font-semibold mt-0.5">
                      难度 {'★'.repeat(item.difficulty)} | {item.duration}分钟
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.dishId, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-lg font-medium active:scale-90 transition-transform"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-gray-700 w-6 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.dishId, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-orange-600 text-white text-lg font-medium active:scale-90 transition-transform shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-5 py-4 bg-white rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-500">
              <p>总难度: <span className="text-orange-600 font-bold">{'★'.repeat(count > 0 ? Math.round(diff / count) : 0)}</span></p>
              <p className="text-xs mt-0.5">总时长: <span className="font-semibold">{dur}分钟</span></p>
            </div>
          </div>
          <button
            onClick={onCheckout}
            disabled={count === 0}
            className={`w-full py-3.5 rounded-2xl text-base font-bold transition-all duration-200 active:scale-[0.98] ${
              count > 0
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            提交订单
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

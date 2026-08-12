import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-600 to-orange-500 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">🍽️</div>
        <h1 className="text-3xl font-bold text-white mb-2">美味餐厅</h1>
        <p className="text-orange-100 text-base">请选择你的身份</p>
      </div>
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate('/customer/login')}
          className="w-full bg-white rounded-2xl p-6 shadow-xl active:scale-[0.98] transition-all text-left flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-3xl">👤</div>
          <div>
            <p className="text-lg font-bold text-gray-800">我是顾客</p>
            <p className="text-sm text-gray-400">浏览菜单 · 点餐下单</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/merchant/login')}
          className="w-full bg-white rounded-2xl p-6 shadow-xl active:scale-[0.98] transition-all text-left flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-3xl">👨‍🍳</div>
          <div>
            <p className="text-lg font-bold text-gray-800">我是商家</p>
            <p className="text-sm text-gray-400">查看订单 · 管理状态</p>
          </div>
        </button>
      </div>
    </div>
  );
}

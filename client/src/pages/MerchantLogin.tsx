import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function MerchantLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 11) {
      setError('请输入正确的11位手机号');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/merchant-login', { phone: clean });
      localStorage.setItem('merchant_token', res.data.token);
      localStorage.setItem('merchant_user', JSON.stringify(res.data.user));
      navigate('/merchant/orders', { replace: true });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'response' in e) {
        const axiosErr = e as { response?: { data?: { error?: string } } };
        setError(axiosErr.response?.data?.error || '登录失败');
      } else {
        setError('网络异常，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-600 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">👨‍🍳</div>
          <h1 className="text-2xl font-bold text-gray-800">商家中心</h1>
          <p className="text-gray-400 text-sm mt-1">商家手机号登录</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-500 text-sm rounded-xl px-4 py-3 mb-4 text-center">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="请输入商家手机号"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3.5 bg-gray-50 rounded-xl text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                验证中...
              </span>
            ) : (
              '商家登录'
            )}
          </button>
        </div>

        <p className="text-gray-300 text-xs text-center mt-6">
          商家专用登录
        </p>
      </div>
    </div>
  );
}

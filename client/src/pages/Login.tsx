import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
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
      const res = await api.post('/auth/phone-login', { phone: clean });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/customer/menu', { replace: true });
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
    <div className="min-h-screen bg-gradient-to-b from-orange-600 to-orange-500 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🍽️</div>
          <h1 className="text-2xl font-bold text-gray-800">美味餐厅</h1>
          <p className="text-gray-400 text-sm mt-1">手机号登录后点餐</p>
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
            placeholder="请输入手机号"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3.5 bg-gray-50 rounded-xl text-base text-center focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                验证中...
              </span>
            ) : (
              '登录'
            )}
          </button>
        </div>

        <p className="text-gray-300 text-xs text-center mt-6">
          仅限白名单用户登录
        </p>
      </div>
    </div>
  );
}

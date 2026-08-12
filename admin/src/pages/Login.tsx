import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Input, Button, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import api from '../api';

const { Title, Paragraph } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      message.warning('请输入密码');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { password });
      localStorage.setItem('token', res.data.token);
      message.success('登录成功');
      navigate('/dishes');
    } catch {
      message.error('密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 400, textAlign: 'center' }}>
        <Title level={3}>点餐后台管理</Title>
        <Paragraph type="secondary">请输入管理员密码登录</Paragraph>
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入密码"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleLogin}
          style={{ marginBottom: 16 }}
        />
        <Button
          type="primary"
          block
          size="large"
          loading={loading}
          onClick={handleLogin}
        >
          登录
        </Button>
        <Paragraph
          type="secondary"
          style={{ marginTop: 12, fontSize: 12, marginBottom: 0 }}
        >
          提示：默认密码 admin123
        </Paragraph>
      </Card>
    </div>
  );
}

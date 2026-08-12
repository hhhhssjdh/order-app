import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message } from 'antd';
import { PlusOutlined, DeleteOutlined, PhoneOutlined } from '@ant-design/icons';
import api from '../api';

interface WhitelistItem {
  id: number;
  phone: string;
  name: string;
  createdAt: string;
}

export default function Whitelist() {
  const [data, setData] = useState<WhitelistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/whitelist');
      setData(res.data);
    } catch { message.error('获取白名单失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/whitelist', values);
      message.success('添加成功');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      if (e?.response?.data?.error) message.error(e.response.data.error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/whitelist/${id}`);
      message.success('删除成功');
      fetchData();
    } catch { message.error('删除失败'); }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '手机号',
      dataIndex: 'phone',
      render: (v: string) => <><PhoneOutlined /> {v}</>,
    },
    { title: '备注', dataIndex: 'name', render: (v: string) => v || '-' },
    {
      title: '添加时间',
      dataIndex: 'createdAt',
      render: (v: string) => new Date(v).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      render: (_: unknown, record: WhitelistItem) => (
        <Popconfirm title="确定移出白名单？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>移除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          添加白名单
        </Button>
      </Space>
      <Table rowKey="id" dataSource={data} columns={columns} loading={loading} pagination={false} />
      <Modal title="添加白名单" open={modalOpen} onOk={handleAdd} onCancel={() => { setModalOpen(false); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          <Form.Item name="phone" label="手机号" rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1\d{10}$/, message: '手机号格式不正确' }
          ]}>
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item name="name" label="备注">
            <Input placeholder="如：张经理桌" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

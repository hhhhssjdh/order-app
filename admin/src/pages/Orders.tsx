import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Descriptions, message } from 'antd';
import api from '../api';

type OrderStatus = 'PENDING' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';

interface OrderItem {
  dishId: number;
  name: string;
  difficulty: number;
  duration: number;
  quantity: number;
}

interface Order {
  id: number;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

const statusConfig: Record<OrderStatus, { color: string; label: string }> = {
  PENDING: { color: 'blue', label: '处理中' },
  PREPARING: { color: 'orange', label: '制作中' },
  COMPLETED: { color: 'green', label: '已完成' },
  CANCELLED: { color: 'red', label: '已取消' },
};

const nextStatus: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PENDING: { status: 'PREPARING', label: '开始制作' },
  PREPARING: { status: 'COMPLETED', label: '完成' },
};

export default function Orders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders');
      setData(res.data);
    } catch {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (id: number, status: OrderStatus) => {
    try {
      await api.patch(`/orders/${id}/status`, { status });
      message.success('状态更新成功');
      fetchData();
    } catch {
      message.error('操作失败');
    }
  };

  const renderStars = (n: number) => '★'.repeat(Math.min(n, 5)) + '☆'.repeat(Math.max(0, 5 - n));

  const expandedRowRender = (record: Order) => (
    <Descriptions column={1} bordered size="small">
      {record.items.map((item, idx) => (
        <Descriptions.Item key={idx} label={item.name}>
          难度: {renderStars(item.difficulty)} &nbsp; 时长: {item.duration}分钟 x {item.quantity}
        </Descriptions.Item>
      ))}
      {record.note && (
        <Descriptions.Item label="备注">{record.note}</Descriptions.Item>
      )}
    </Descriptions>
  );

  const columns = [
    { title: '订单号', dataIndex: 'id', key: 'id', width: 80 },
    {
      title: '菜品',
      key: 'items',
      render: (_: unknown, record: Order) =>
        record.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join('、'),
    },
    {
      title: '数量',
      key: 'totalQty',
      render: (_: unknown, record: Order) => record.items.reduce((s, i) => s + i.quantity, 0),
    },
    {
      title: '难度',
      key: 'difficulty',
      render: (_: unknown, record: Order) => {
        const totalQty = record.items.reduce((s, i) => s + i.quantity, 0);
        const avgDiff = totalQty > 0
          ? Math.round(record.items.reduce((s, i) => s + i.difficulty * i.quantity, 0) / totalQty)
          : 0;
        return renderStars(avgDiff);
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: OrderStatus) => (
        <Tag color={statusConfig[v]?.color}>{statusConfig[v]?.label || v}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => (v ? new Date(v).toLocaleString() : ''),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Order) => {
        const next = nextStatus[record.status];
        if (!next) return null;
        return (
          <Button
            type="primary"
            size="small"
            onClick={() => handleUpdateStatus(record.id, next.status)}
          >
            {next.label}
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={loading}
        pagination={false}
        expandable={{
          expandedRowRender,
          rowExpandable: () => true,
        }}
      />
    </div>
  );
}

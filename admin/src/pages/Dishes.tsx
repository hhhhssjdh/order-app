import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Popconfirm,
  Switch,
  Upload,
  Image,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../api';

interface Category {
  id: number;
  name: string;
}

interface Dish {
  id: number;
  name: string;
  difficulty: number;
  duration: number;
  category: Category | null;
  categoryId: number | null;
  status: 'ENABLED' | 'DISABLED';
  sort: number;
  description?: string;
  image?: string;
}

export default function Dishes() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dish | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
  const [form] = Form.useForm();
  const [previewKey, setPreviewKey] = useState(0);

  const fetchDishes = useCallback(async () => {
    setLoading(true);
    try {
      const params = categoryFilter ? { categoryId: categoryFilter } : {};
      const res = await api.get('/dishes', { params });
      setDishes(res.data);
    } catch {
      message.error('获取菜品列表失败');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const handleAdd = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ sort: 0, difficulty: 1, duration: 0, status: 'ENABLED' });
    setModalOpen(true);
  };

  const handleEdit = (record: Dish) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      categoryId: record.category?.id ?? record.categoryId,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/dishes/${id}`);
      message.success('删除成功');
      fetchDishes();
    } catch {
      message.error('删除失败');
    }
  };

  const handleToggleStatus = async (record: Dish) => {
    const newStatus = record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';
    try {
      await api.patch(`/dishes/${record.id}`, { status: newStatus });
      message.success(newStatus === 'ENABLED' ? '已上架' : '已下架');
      fetchDishes();
    } catch {
      message.error('操作失败');
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.patch(`/dishes/${editing.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/dishes', values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchDishes();
    } catch {
      // validation failed
    }
  };

  const renderStars = (level: number) =>
    '★'.repeat(level) + '☆'.repeat(5 - level);

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '名称', dataIndex: 'name', key: 'name' },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (v: number) => renderStars(v),
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (v: number) => `${v}分钟`,
    },
    {
      title: '分类',
      key: 'category',
      render: (_: unknown, record: Dish) =>
        record.category?.name || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => (
        <Tag color={v === 'ENABLED' ? 'green' : 'red'}>
          {v === 'ENABLED' ? '上架' : '下架'}
        </Tag>
      ),
    },
    { title: '排序', dataIndex: 'sort', key: 'sort', width: 80 },
    {
      title: '操作',
      key: 'actions',
      render: (_: unknown, record: Dish) => (
        <Space>
          <Switch
            checked={record.status === 'ENABLED'}
            checkedChildren="上架"
            unCheckedChildren="下架"
            onChange={() => handleToggleStatus(record)}
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除该菜品？"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="按分类筛选"
          allowClear
          style={{ width: 200 }}
          value={categoryFilter}
          onChange={(v) => setCategoryFilter(v)}
          options={categories.map((c) => ({ label: c.name, value: c.id }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增菜品
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={dishes}
        columns={columns}
        loading={loading}
        pagination={false}
      />
      <Modal
        title={editing ? '编辑菜品' : '新增菜品'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="名称"
            rules={[{ required: true, message: '请输入菜品名称' }]}
          >
            <Input placeholder="请输入菜品名称" />
          </Form.Item>
          <Form.Item
            name="difficulty"
            label="难度"
            rules={[{ required: true, message: '请选择难度' }]}
          >
            <Select
              options={[
                { label: '⭐', value: 1 },
                { label: '⭐⭐', value: 2 },
                { label: '⭐⭐⭐', value: 3 },
                { label: '⭐⭐⭐⭐', value: 4 },
                { label: '⭐⭐⭐⭐⭐', value: 5 },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="duration"
            label="制作时长"
            rules={[{ required: true, message: '请输入制作时长' }]}
          >
            <InputNumber
              min={0}
              addonAfter="分钟"
              style={{ width: '100%' }}
              placeholder="请输入制作时长"
            />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select
              placeholder="请选择分类"
              allowClear
              options={categories.map((c) => ({
                label: c.name,
                value: c.id,
              }))}
            />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入菜品描述" />
          </Form.Item>
          <Form.Item name="image" label="菜品图片" key={previewKey}>
            <Space direction="vertical" style={{ width: '100%' }}>
              {form.getFieldValue('image') && (
                <Image
                  src={form.getFieldValue('image')}
                  width={120}
                  style={{ borderRadius: 8, objectFit: 'cover' }}
                  preview={{ mask: '预览' }}
                />
              )}
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  const formData = new FormData();
                  formData.append('file', file as Blob);
                  try {
                    const res = await api.post('/upload', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    form.setFieldsValue({ image: res.data.thumb || res.data.original });
                    setPreviewKey(prev => prev + 1);
                    message.success('上传成功');
                    onSuccess?.(res.data);
                  } catch (e) {
                    message.error('上传失败');
                    onError?.(e as Error);
                  }
                }}
              >
                <Button icon={<UploadOutlined />}>上传图片</Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="sort" label="排序">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

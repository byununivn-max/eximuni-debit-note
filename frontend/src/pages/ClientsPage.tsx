import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Tag, Modal, Form, Input, Select, message, Card } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { Client } from '../types';

const { Title } = Typography;

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form] = Form.useForm();

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/clients?limit=200');
      setClients(res.data.items);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '거래처 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingClient) {
        await api.put(`/api/v1/clients/${editingClient.client_id}`, values);
        message.success('거래처 수정 완료');
      } else {
        await api.post('/api/v1/clients', values);
        message.success('거래처 등록 완료');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingClient(null);
      fetchClients();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '저장 실패');
    }
  };

  const openEdit = (client: Client) => {
    setEditingClient(client);
    form.setFieldsValue(client);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditingClient(null);
    form.resetFields();
    form.setFieldsValue({ currency: 'VND', complexity: 'Medium' });
    setModalOpen(true);
  };

  const columns = [
    { title: '코드', dataIndex: 'client_code', key: 'code', width: 120 },
    { title: '거래처명', dataIndex: 'client_name', key: 'name', width: 250 },
    { title: '통화', dataIndex: 'currency', key: 'currency', width: 80 },
    { title: '복잡도', dataIndex: 'complexity', key: 'complexity', width: 100,
      render: (v: string) => {
        const color = v === 'High' ? 'red' : v === 'Medium' ? 'orange' : 'green';
        return <Tag color={color}>{v}</Tag>;
      },
    },
    { title: '배치', dataIndex: 'batch', key: 'batch', width: 100 },
    { title: '구조', dataIndex: 'structure_type', key: 'structure', width: 140 },
    { title: '상태', dataIndex: 'is_active', key: 'active', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag>,
    },
    { title: '', key: 'action', width: 80,
      render: (_: any, r: Client) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>수정</Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>거래처 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>거래처 등록</Button>
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="client_id"
          loading={loading}
          size="small"
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingClient ? '거래처 수정' : '거래처 등록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditingClient(null); }}
        okText="저장"
        cancelText="취소"
        width={600}
      >
        <Form form={form} layout="vertical">
          {!editingClient && (
            <Form.Item name="client_code" label="거래처 코드" rules={[{ required: true }]}>
              <Input placeholder="NEXCON" />
            </Form.Item>
          )}
          <Form.Item name="client_name" label="거래처명" rules={[{ required: true }]}>
            <Input placeholder="NEXCON VIETNAM CO., LTD" />
          </Form.Item>
          <Form.Item name="client_name_en" label="영문 거래처명">
            <Input />
          </Form.Item>
          <Space size="large">
            <Form.Item name="currency" label="통화">
              <Select style={{ width: 120 }} options={[
                { value: 'VND', label: 'VND' },
                { value: 'USD', label: 'USD' },
                { value: 'Mixed', label: 'Mixed' },
              ]} />
            </Form.Item>
            <Form.Item name="complexity" label="복잡도">
              <Select style={{ width: 120 }} options={[
                { value: 'Low', label: 'Low' },
                { value: 'Medium', label: 'Medium' },
                { value: 'High', label: 'High' },
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="contact_person" label="담당자">
            <Input />
          </Form.Item>
          <Form.Item name="contact_email" label="이메일">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ClientsPage;

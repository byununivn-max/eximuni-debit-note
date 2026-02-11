import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form, Input, Select,
  message, Card, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  supplier_type: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  tax_id?: string;
  bank_account?: string;
  bank_name?: string;
  payment_terms?: string;
  currency: string;
  address?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const SUPPLIER_TYPES = [
  { value: 'shipping_line', label: '선사' },
  { value: 'trucking', label: '운송사' },
  { value: 'customs_broker', label: '관세사' },
  { value: 'co_agent', label: 'CO 대행사' },
  { value: 'other', label: '기타' },
];

const typeLabels: Record<string, string> = {
  shipping_line: '선사',
  trucking: '운송사',
  customs_broker: '관세사',
  co_agent: 'CO 대행사',
  other: '기타',
};

const typeColors: Record<string, string> = {
  shipping_line: 'blue',
  trucking: 'green',
  customs_broker: 'orange',
  co_agent: 'purple',
  other: 'default',
};

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (typeFilter) params.supplier_type = typeFilter;

      const res = await api.get('/api/v1/suppliers', { params });
      setSuppliers(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '공급사 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, typeFilter]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/api/v1/suppliers/${editing.supplier_id}`, values);
        message.success('공급사 수정 완료');
      } else {
        await api.post('/api/v1/suppliers', values);
        message.success('공급사 등록 완료');
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '저장 실패');
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    form.setFieldsValue(supplier);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ supplier_type: 'other', currency: 'VND' });
    setModalOpen(true);
  };

  const columns = [
    { title: '코드', dataIndex: 'supplier_code', key: 'code', width: 120 },
    { title: '공급사명', dataIndex: 'supplier_name', key: 'name', width: 250 },
    { title: '유형', dataIndex: 'supplier_type', key: 'type', width: 100,
      render: (v: string) => (
        <Tag color={typeColors[v] || 'default'}>{typeLabels[v] || v}</Tag>
      ),
    },
    { title: '담당자', dataIndex: 'contact_person', key: 'contact', width: 120 },
    { title: '이메일', dataIndex: 'contact_email', key: 'email', width: 180 },
    { title: '전화', dataIndex: 'contact_phone', key: 'phone', width: 130 },
    { title: '결제조건', dataIndex: 'payment_terms', key: 'terms', width: 100 },
    { title: '통화', dataIndex: 'currency', key: 'currency', width: 70 },
    { title: '상태', dataIndex: 'is_active', key: 'active', width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag>
      ),
    },
    { title: '', key: 'action', width: 80,
      render: (_: any, r: Supplier) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>공급사 관리</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          공급사 등록
        </Button>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="코드/이름 검색"
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={(e) => {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }}
              onChange={(e) => {
                if (!e.target.value) { setSearch(''); setPage(1); }
              }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="유형"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={SUPPLIER_TYPES}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="supplier_id"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title={editing ? '공급사 수정' : '공급사 등록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        okText="저장"
        cancelText="취소"
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="supplier_code" label="공급사 코드"
                rules={[{ required: true }]}
              >
                <Input placeholder="SL-001" disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="supplier_name" label="공급사명"
                rules={[{ required: true }]}
              >
                <Input placeholder="회사명" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supplier_type" label="유형" rules={[{ required: true }]}>
                <Select options={SUPPLIER_TYPES} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label="통화">
                <Select options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                  { value: 'KRW', label: 'KRW' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="payment_terms" label="결제조건">
                <Select allowClear options={[
                  { value: 'COD', label: 'COD' },
                  { value: 'NET15', label: 'NET 15' },
                  { value: 'NET30', label: 'NET 30' },
                  { value: 'NET60', label: 'NET 60' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contact_person" label="담당자">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contact_email" label="이메일">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contact_phone" label="전화">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tax_id" label="세금 ID">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bank_name" label="은행명">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bank_account" label="계좌번호">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="주소">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;

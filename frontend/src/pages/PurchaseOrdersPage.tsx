import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form, Input, Select,
  InputNumber, DatePicker, Divider, message, Card, Row, Col, Popconfirm,
  Descriptions,
} from 'antd';
import {
  PlusOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title } = Typography;

interface PurchaseItem {
  item_id?: number;
  po_id?: number;
  description: string;
  cost_category?: string;
  quantity: number;
  unit_price: number;
  currency: string;
  amount: number;
  is_vat_applicable: boolean;
  notes?: string;
}

interface PurchaseOrder {
  po_id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  mssql_shipment_ref?: number;
  service_type?: string;
  invoice_no?: string;
  invoice_date?: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  amount_vnd?: number;
  vat_rate?: number;
  vat_amount?: number;
  total_amount: number;
  payment_status: string;
  status: string;
  approved_by?: number;
  approved_at?: string;
  created_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: PurchaseItem[];
}

interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'green',
  CANCELLED: 'red',
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: 'red',
  PARTIAL: 'orange',
  PAID: 'green',
};

const COST_CATEGORIES = [
  { value: 'freight', label: '운임' },
  { value: 'handling', label: '하역' },
  { value: 'customs', label: '통관' },
  { value: 'trucking', label: '운송' },
  { value: 'co', label: 'CO' },
  { value: 'other', label: '기타' },
];

const PurchaseOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<PurchaseOrder | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const [poRes, supRes] = await Promise.all([
        api.get('/api/v1/purchase-orders', { params }),
        api.get('/api/v1/suppliers?limit=200&is_active=true'),
      ]);
      setOrders(poRes.data.items);
      setTotal(poRes.data.total);
      setSuppliers(supRes.data.items);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '매입 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, statusFilter]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
        items: (values.items || []).filter(
          (i: any) => i && i.description
        ).map((i: any) => ({
          ...i,
          amount: (i.quantity || 1) * (i.unit_price || 0),
          currency: i.currency || values.currency || 'VND',
        })),
      };
      await api.post('/api/v1/purchase-orders', payload);
      message.success('매입주문 등록 완료');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '등록 실패');
    }
  };

  const handleConfirm = async (poId: number) => {
    try {
      await api.post(`/api/v1/purchase-orders/${poId}/confirm`);
      message.success('매입주문 확정 완료');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '확정 실패');
    }
  };

  const handleCancel = async (poId: number) => {
    try {
      await api.post(`/api/v1/purchase-orders/${poId}/cancel`);
      message.success('매입주문 취소 완료');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '취소 실패');
    }
  };

  const showDetail = async (poId: number) => {
    try {
      const res = await api.get<PurchaseOrder>(`/api/v1/purchase-orders/${poId}`);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '상세 조회 실패');
    }
  };

  const columns = [
    { title: 'PO No.', dataIndex: 'po_number', key: 'po', width: 160 },
    { title: '공급사', dataIndex: 'supplier_name', key: 'supplier', width: 200 },
    { title: '서비스', dataIndex: 'service_type', key: 'service', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: 'Invoice', dataIndex: 'invoice_no', key: 'invoice', width: 130 },
    { title: '금액', dataIndex: 'total_amount', key: 'amount', width: 130, align: 'right' as const,
      render: (v: number, r: PurchaseOrder) =>
        `${Number(v).toLocaleString()} ${r.currency}`,
    },
    { title: '상태', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>
      ),
    },
    { title: '결제', dataIndex: 'payment_status', key: 'payment', width: 90,
      render: (v: string) => (
        <Tag color={PAYMENT_COLORS[v] || 'default'}>{v}</Tag>
      ),
    },
    { title: '항목수', key: 'items', width: 70, align: 'center' as const,
      render: (_: any, r: PurchaseOrder) => r.items?.length || 0,
    },
    { title: '', key: 'action', width: 200,
      render: (_: any, r: PurchaseOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => showDetail(r.po_id)}>
            상세
          </Button>
          {r.status === 'DRAFT' && (
            <>
              <Popconfirm title="매입주문을 확정하시겠습니까?"
                onConfirm={() => handleConfirm(r.po_id)}>
                <Button type="link" size="small" icon={<CheckCircleOutlined />}
                  style={{ color: 'green' }}>
                  확정
                </Button>
              </Popconfirm>
              <Popconfirm title="매입주문을 취소하시겠습니까?"
                onConfirm={() => handleCancel(r.po_id)}>
                <Button type="link" size="small" icon={<CloseCircleOutlined />}
                  danger>
                  취소
                </Button>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>매입 관리</Title>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { form.resetFields(); form.setFieldsValue({ currency: 'VND' }); setModalOpen(true); }}>
          매입주문 등록
        </Button>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="PO번호/Invoice 검색"
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
              placeholder="상태"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'DRAFT', label: 'DRAFT' },
                { value: 'CONFIRMED', label: 'CONFIRMED' },
                { value: 'CANCELLED', label: 'CANCELLED' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="po_id"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `총 ${t}건`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* 등록 모달 */}
      <Modal
        title="매입주문 등록"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText="등록"
        cancelText="취소"
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier_id" label="공급사" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={suppliers.map((s) => ({
                    value: s.supplier_id,
                    label: `${s.supplier_code} - ${s.supplier_name}`,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="service_type" label="서비스 유형">
                <Select allowClear options={COST_CATEGORIES} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="currency" label="통화">
                <Select options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                  { value: 'KRW', label: 'KRW' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="invoice_no" label="Invoice No.">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoice_date" label="Invoice 일자">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mssql_shipment_ref" label="Shipment Ref (ID)">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="amount" label="공급가">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="vat_rate" label="VAT율 (%)">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="vat_amount" label="VAT 금액">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="total_amount" label="합계">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>매입 상세 항목</Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} align="middle">
                    <Col span={7}>
                      <Form.Item name={[name, 'description']} rules={[{ required: true }]}>
                        <Input placeholder="항목 설명" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'cost_category']}>
                        <Select placeholder="분류" options={COST_CATEGORIES} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item name={[name, 'quantity']}>
                        <InputNumber placeholder="수량" style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'unit_price']}>
                        <InputNumber placeholder="단가" style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'notes']}>
                        <Input placeholder="비고" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button danger size="small" onClick={() => remove(name)}>삭제</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1, currency: 'VND' })}
                  block icon={<PlusOutlined />}>
                  항목 추가
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 상세 모달 */}
      <Modal
        title={`매입주문 상세 — ${detailData?.po_number || ''}`}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailData(null); }}
        footer={null}
        width={750}
      >
        {detailData && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="PO No.">{detailData.po_number}</Descriptions.Item>
              <Descriptions.Item label="공급사">{detailData.supplier_name}</Descriptions.Item>
              <Descriptions.Item label="서비스">{detailData.service_type}</Descriptions.Item>
              <Descriptions.Item label="Invoice">{detailData.invoice_no}</Descriptions.Item>
              <Descriptions.Item label="금액">
                {Number(detailData.total_amount).toLocaleString()} {detailData.currency}
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={STATUS_COLORS[detailData.status]}>{detailData.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="결제">
                <Tag color={PAYMENT_COLORS[detailData.payment_status]}>{detailData.payment_status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Shipment Ref">{detailData.mssql_shipment_ref || '-'}</Descriptions.Item>
              {detailData.notes && (
                <Descriptions.Item label="메모" span={2}>{detailData.notes}</Descriptions.Item>
              )}
            </Descriptions>

            {detailData.items.length > 0 && (
              <>
                <Divider>상세 항목 ({detailData.items.length}건)</Divider>
                <Table
                  dataSource={detailData.items}
                  rowKey="item_id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: '항목', dataIndex: 'description', width: 200 },
                    { title: '분류', dataIndex: 'cost_category', width: 80,
                      render: (v: string) => v ? <Tag>{v}</Tag> : null },
                    { title: '수량', dataIndex: 'quantity', width: 80, align: 'right' as const },
                    { title: '단가', dataIndex: 'unit_price', width: 120, align: 'right' as const,
                      render: (v: number) => Number(v).toLocaleString() },
                    { title: '금액', dataIndex: 'amount', width: 120, align: 'right' as const,
                      render: (v: number) => Number(v).toLocaleString() },
                    { title: '비고', dataIndex: 'notes', width: 150 },
                  ]}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;

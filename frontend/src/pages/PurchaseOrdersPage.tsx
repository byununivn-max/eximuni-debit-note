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
import { useTranslation } from 'react-i18next';
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

const COST_CATEGORY_KEYS: Record<string, string> = {
  freight: 'common:costCategory.freight',
  handling: 'common:costCategory.handling',
  customs: 'common:costCategory.customs',
  trucking: 'common:costCategory.trucking',
  co: 'common:costCategory.co',
  other: 'common:costCategory.other',
};

const PurchaseOrdersPage: React.FC = () => {
  const { t } = useTranslation(['trading', 'common']);
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
      message.error(err.response?.data?.detail || t('trading:purchaseOrders.fetchFailed'));
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
      message.success(t('trading:purchaseOrders.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.createFailed'));
    }
  };

  const handleConfirm = async (poId: number) => {
    try {
      await api.post(`/api/v1/purchase-orders/${poId}/confirm`);
      message.success(t('trading:purchaseOrders.confirmSuccess'));
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.confirmFailed'));
    }
  };

  const handleCancel = async (poId: number) => {
    try {
      await api.post(`/api/v1/purchase-orders/${poId}/cancel`);
      message.success(t('trading:purchaseOrders.cancelSuccess'));
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.cancelFailed'));
    }
  };

  const showDetail = async (poId: number) => {
    try {
      const res = await api.get<PurchaseOrder>(`/api/v1/purchase-orders/${poId}`);
      setDetailData(res.data);
      setDetailOpen(true);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.fetchFailed'));
    }
  };

  const columns = [
    { title: t('trading:purchaseOrders.columnPoNumber'), dataIndex: 'po_number', key: 'po', width: 160 },
    { title: t('trading:purchaseOrders.columnSupplier'), dataIndex: 'supplier_name', key: 'supplier', width: 200 },
    { title: t('trading:purchaseOrders.columnService'), dataIndex: 'service_type', key: 'service', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: t('trading:purchaseOrders.columnInvoice'), dataIndex: 'invoice_no', key: 'invoice', width: 130 },
    { title: t('trading:purchaseOrders.columnAmount'), dataIndex: 'total_amount', key: 'amount', width: 130, align: 'right' as const,
      render: (v: number, r: PurchaseOrder) =>
        `${Number(v).toLocaleString()} ${r.currency}`,
    },
    { title: t('trading:purchaseOrders.columnStatus'), dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => (
        <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag>
      ),
    },
    { title: t('trading:purchaseOrders.columnPayment'), dataIndex: 'payment_status', key: 'payment', width: 90,
      render: (v: string) => (
        <Tag color={PAYMENT_COLORS[v] || 'default'}>{v}</Tag>
      ),
    },
    { title: t('trading:purchaseOrders.columnItemCount'), key: 'items', width: 70, align: 'center' as const,
      render: (_: any, r: PurchaseOrder) => r.items?.length || 0,
    },
    { title: '', key: 'action', width: 200,
      render: (_: any, r: PurchaseOrder) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />}
            onClick={() => showDetail(r.po_id)}>
            {t('common:button.detail')}
          </Button>
          {r.status === 'DRAFT' && (
            <>
              <Popconfirm title={t('trading:purchaseOrders.confirmQuestion')}
                onConfirm={() => handleConfirm(r.po_id)}>
                <Button type="link" size="small" icon={<CheckCircleOutlined />}
                  style={{ color: 'green' }}>
                  {t('common:button.confirm')}
                </Button>
              </Popconfirm>
              <Popconfirm title={t('trading:purchaseOrders.cancelQuestion')}
                onConfirm={() => handleCancel(r.po_id)}>
                <Button type="link" size="small" icon={<CloseCircleOutlined />}
                  danger>
                  {t('common:button.cancel')}
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
        <Title level={4} style={{ margin: 0 }}>{t('trading:purchaseOrders.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />}
          onClick={() => { form.resetFields(); form.setFieldsValue({ currency: 'VND' }); setModalOpen(true); }}>
          {t('trading:purchaseOrders.createButton')}
        </Button>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder={t('trading:purchaseOrders.searchPlaceholder')}
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
              placeholder={t('trading:purchaseOrders.statusFilter')}
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'DRAFT', label: t('common:status.draft') },
                { value: 'CONFIRMED', label: t('common:status.confirmed') },
                { value: 'CANCELLED', label: t('common:status.cancelled') },
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
            showTotal: (total) => t('common:pagination.totalItems', { count: total }),
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      {/* 등록 모달 */}
      <Modal
        title={t('trading:purchaseOrders.createTitle')}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText={t('common:button.create')}
        cancelText={t('common:button.cancel')}
        width={800}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="supplier_id" label={t('trading:purchaseOrders.formSupplier')} rules={[{ required: true }]}>
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
              <Form.Item name="service_type" label={t('trading:purchaseOrders.formServiceType')}>
                <Select allowClear options={Object.entries(COST_CATEGORY_KEYS).map(([value, key]) => ({ value, label: t(key) }))} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="currency" label={t('trading:purchaseOrders.formCurrency')}>
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
              <Form.Item name="invoice_no" label={t('trading:purchaseOrders.formInvoiceNo')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoice_date" label={t('trading:purchaseOrders.formInvoiceDate')}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mssql_shipment_ref" label={t('trading:purchaseOrders.formShipmentRef')}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="amount" label={t('trading:purchaseOrders.formSupplyPrice')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="vat_rate" label={t('trading:purchaseOrders.formVatRate')}>
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="vat_amount" label={t('trading:purchaseOrders.formVatAmount')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="total_amount" label={t('trading:purchaseOrders.formTotal')}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label={t('trading:purchaseOrders.formMemo')}>
            <Input.TextArea rows={2} />
          </Form.Item>

          <Divider>{t('trading:purchaseOrders.detailItems')}</Divider>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} align="middle">
                    <Col span={7}>
                      <Form.Item name={[name, 'description']} rules={[{ required: true }]}>
                        <Input placeholder={t('trading:purchaseOrders.itemDescription')} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'cost_category']}>
                        <Select placeholder={t('trading:purchaseOrders.itemCategory')} options={Object.entries(COST_CATEGORY_KEYS).map(([value, key]) => ({ value, label: t(key) }))} />
                      </Form.Item>
                    </Col>
                    <Col span={3}>
                      <Form.Item name={[name, 'quantity']}>
                        <InputNumber placeholder={t('trading:purchaseOrders.itemQuantity')} style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'unit_price']}>
                        <InputNumber placeholder={t('trading:purchaseOrders.itemUnitPrice')} style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item name={[name, 'notes']}>
                        <Input placeholder={t('trading:purchaseOrders.itemNote')} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button danger size="small" onClick={() => remove(name)}>{t('common:button.delete')}</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add({ quantity: 1, currency: 'VND' })}
                  block icon={<PlusOutlined />}>
                  {t('trading:purchaseOrders.addItem')}
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* 상세 모달 */}
      <Modal
        title={`${t('trading:purchaseOrders.detailTitle')} — ${detailData?.po_number || ''}`}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailData(null); }}
        footer={null}
        width={750}
      >
        {detailData && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label={t('trading:purchaseOrders.columnPoNumber')}>{detailData.po_number}</Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnSupplier')}>{detailData.supplier_name}</Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnService')}>{detailData.service_type}</Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnInvoice')}>{detailData.invoice_no}</Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnAmount')}>
                {Number(detailData.total_amount).toLocaleString()} {detailData.currency}
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnStatus')}>
                <Tag color={STATUS_COLORS[detailData.status]}>{detailData.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.columnPayment')}>
                <Tag color={PAYMENT_COLORS[detailData.payment_status]}>{detailData.payment_status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:purchaseOrders.formShipmentRef')}>{detailData.mssql_shipment_ref || '-'}</Descriptions.Item>
              {detailData.notes && (
                <Descriptions.Item label={t('trading:purchaseOrders.formMemo')} span={2}>{detailData.notes}</Descriptions.Item>
              )}
            </Descriptions>

            {detailData.items.length > 0 && (
              <>
                <Divider>{t('trading:purchaseOrders.detailItemsCount', { count: detailData.items.length })}</Divider>
                <Table
                  dataSource={detailData.items}
                  rowKey="item_id"
                  size="small"
                  pagination={false}
                  columns={[
                    { title: t('trading:purchaseOrders.itemDescription'), dataIndex: 'description', width: 200 },
                    { title: t('trading:purchaseOrders.itemCategory'), dataIndex: 'cost_category', width: 80,
                      render: (v: string) => v ? <Tag>{v}</Tag> : null },
                    { title: t('trading:purchaseOrders.itemQuantity'), dataIndex: 'quantity', width: 80, align: 'right' as const },
                    { title: t('trading:purchaseOrders.itemUnitPrice'), dataIndex: 'unit_price', width: 120, align: 'right' as const,
                      render: (v: number) => Number(v).toLocaleString() },
                    { title: t('trading:purchaseOrders.itemAmount'), dataIndex: 'amount', width: 120, align: 'right' as const,
                      render: (v: number) => Number(v).toLocaleString() },
                    { title: t('trading:purchaseOrders.itemNote'), dataIndex: 'notes', width: 150 },
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

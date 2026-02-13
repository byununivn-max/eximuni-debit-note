import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography, Button,
  Spin, Row, Col, Space, Statistic, Modal, Form, InputNumber,
  message,
} from 'antd';
import {
  SwapOutlined, PlusOutlined, SearchOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

interface QuotationActual {
  comparison_id: number;
  mssql_shipment_ref: string | null;
  customer_id: number | null;
  customer_name: string | null;
  service_type: string;
  quotation_amount: number;
  actual_selling: number;
  actual_buying: number;
  variance_selling: number;
  variance_buying: number;
  variance_gp: number;
  invoice_no: string | null;
  analysis_date: string | null;
  notes: string | null;
}

interface Summary {
  total_count: number;
  total_quotation: number;
  total_selling: number;
  total_buying: number;
  total_gp: number;
  variance_selling: number;
  variance_gp: number;
  accuracy_rate: number;
}

const TYPE_COLOR: Record<string, string> = {
  clearance: 'blue',
  ops: 'green',
  co: 'purple',
};

const fmtNum = (v: number) => {
  if (!v && v !== 0) return '-';
  if (v === 0) return '-';
  return Math.round(v).toLocaleString();
};

const QuotationComparisonPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuotationActual[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [serviceType, setServiceType] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: 1, size: 100 };
      if (year) params.year = year;
      if (serviceType) params.service_type = serviceType;
      if (search) params.customer_name = search;

      const [listRes, sumRes] = await Promise.all([
        api.get('/api/v1/quotation-comparison', { params }),
        api.get('/api/v1/quotation-comparison/summary', {
          params: year ? { year } : {},
        }),
      ]);
      setItems(listRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, serviceType, search]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/api/v1/quotation-comparison', values);
      message.success(t('analytics:quotation.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: t('analytics:quotation.columnType'), dataIndex: 'service_type', key: 'type',
      width: 80, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v] || 'default'}>
          {v.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('analytics:quotation.columnCustomer'), dataIndex: 'customer_name', key: 'name',
      ellipsis: true, width: 160,
      render: (v: string | null) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: t('analytics:quotation.columnInvoice'), dataIndex: 'invoice_no', key: 'inv',
      width: 120, ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('analytics:quotation.columnAnalysisDate'), dataIndex: 'analysis_date', key: 'date',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('analytics:quotation.columnQuotation'), dataIndex: 'quotation_amount', key: 'quot',
      width: 130, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('analytics:quotation.columnActualSelling'), dataIndex: 'actual_selling', key: 'sell',
      width: 130, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('analytics:quotation.columnActualBuying'), dataIndex: 'actual_buying', key: 'buy',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: t('analytics:quotation.columnVarianceSelling'), dataIndex: 'variance_selling', key: 'vs',
      width: 120, align: 'right' as const,
      render: (v: number) => (
        <Text style={{
          color: v > 0 ? '#3f8600' : v < 0 ? '#cf1322' : undefined,
          fontWeight: 600,
        }}>
          {v > 0 ? '+' : ''}{fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:quotation.columnVarianceGp'), dataIndex: 'variance_gp', key: 'vgp',
      width: 120, align: 'right' as const,
      render: (v: number) => (
        <Tag color={v > 0 ? 'green' : v < 0 ? 'red' : 'default'}>
          {v > 0 ? '+' : ''}{fmtNum(v)}
        </Tag>
      ),
    },
  ];

  if (loading && items.length === 0) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <SwapOutlined style={{ marginRight: 8 }} />
            {t('analytics:quotation.title')}
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              allowClear
              placeholder={t('common:filter.year')}
              style={{ width: 100 }}
              options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
            />
            <Select
              value={serviceType}
              onChange={setServiceType}
              allowClear
              placeholder={t('common:filter.typeFilter')}
              style={{ width: 120 }}
              options={[
                { value: 'clearance', label: 'Clearance' },
                { value: 'ops', label: 'Ops' },
                { value: 'co', label: 'CO' },
              ]}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalOpen(true)}
            >
              {t('analytics:quotation.createButton')}
            </Button>
          </Space>
        </Col>
      </Row>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title={t('analytics:quotation.totalCount')} value={summary.total_count} suffix="건" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title={t('analytics:quotation.totalQuotation')}
                value={summary.total_quotation}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title={t('analytics:quotation.totalSelling')}
                value={summary.total_selling}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title={t('analytics:quotation.totalGp')}
                value={summary.total_gp}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
                valueStyle={{ color: summary.total_gp >= 0 ? '#3f8600' : '#cf1322' }}
                prefix={summary.total_gp >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title={t('analytics:quotation.varianceSelling')}
                value={summary.variance_selling}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
                valueStyle={{
                  color: summary.variance_selling >= 0 ? '#3f8600' : '#cf1322',
                }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title={t('analytics:quotation.accuracy')}
                value={summary.accuracy_rate}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: summary.accuracy_rate >= 90 ? '#3f8600' : '#d46b08',
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('analytics:quotation.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => setSearch(e.target.value)}
          allowClear
          style={{ width: 220 }}
        />
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="comparison_id"
          pagination={false}
          size="small"
          scroll={{ x: 1200 }}
          loading={loading}
        />
      </Card>

      <Modal
        title={t('analytics:quotation.createTitle')}
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText={t('common:button.create')}
        cancelText={t('common:button.cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="customer_name" label={t('analytics:quotation.formCustomer')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="service_type" label={t('analytics:quotation.formType')} initialValue="clearance">
            <Select options={[
              { value: 'clearance', label: 'Clearance' },
              { value: 'ops', label: 'Ops' },
              { value: 'co', label: 'CO' },
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quotation_amount" label={t('analytics:quotation.formQuotation')}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actual_selling" label={t('analytics:quotation.formActualSelling')}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actual_buying" label={t('analytics:quotation.formActualBuying')}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="invoice_no" label={t('analytics:quotation.formInvoice')}>
            <Input />
          </Form.Item>
          <Form.Item name="notes" label={t('analytics:quotation.formNotes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuotationComparisonPage;

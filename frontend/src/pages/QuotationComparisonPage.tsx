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
      message.success('견적-실적 비교 데이터가 등록되었습니다.');
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const columns = [
    {
      title: '유형', dataIndex: 'service_type', key: 'type',
      width: 80, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v] || 'default'}>
          {v.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '고객명', dataIndex: 'customer_name', key: 'name',
      ellipsis: true, width: 160,
      render: (v: string | null) => <Text strong>{v || '-'}</Text>,
    },
    {
      title: 'Invoice', dataIndex: 'invoice_no', key: 'inv',
      width: 120, ellipsis: true,
      render: (v: string | null) => v || '-',
    },
    {
      title: '분석일', dataIndex: 'analysis_date', key: 'date',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: '견적', dataIndex: 'quotation_amount', key: 'quot',
      width: 130, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: '실제 매출', dataIndex: 'actual_selling', key: 'sell',
      width: 130, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: '실제 매입', dataIndex: 'actual_buying', key: 'buy',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: '매출 차이', dataIndex: 'variance_selling', key: 'vs',
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
      title: 'GP 차이', dataIndex: 'variance_gp', key: 'vgp',
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
            견적-실적 비교 분석
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              allowClear
              placeholder="연도"
              style={{ width: 100 }}
              options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
            />
            <Select
              value={serviceType}
              onChange={setServiceType}
              allowClear
              placeholder="유형"
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
              신규 등록
            </Button>
          </Space>
        </Col>
      </Row>

      {summary && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size="small">
              <Statistic title="총 건수" value={summary.total_count} suffix="건" />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="견적 합계"
                value={summary.total_quotation}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="실제 매출"
                value={summary.total_selling}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small">
              <Statistic
                title="실제 GP"
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
                title="매출 편차"
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
                title="정확도"
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
          placeholder="고객명 검색"
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
        title="견적-실적 비교 등록"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText="등록"
        cancelText="취소"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="customer_name" label="고객명" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="service_type" label="유형" initialValue="clearance">
            <Select options={[
              { value: 'clearance', label: 'Clearance' },
              { value: 'ops', label: 'Ops' },
              { value: 'co', label: 'CO' },
            ]} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="quotation_amount" label="견적 금액">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actual_selling" label="실제 매출">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actual_buying" label="실제 매입">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="invoice_no" label="인보이스 번호">
            <Input />
          </Form.Item>
          <Form.Item name="notes" label="비고">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuotationComparisonPage;

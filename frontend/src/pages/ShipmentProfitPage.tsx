import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography,
  Spin, Row, Col, Space, Pagination,
} from 'antd';
import {
  ContainerOutlined, SearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

interface ShipmentProfit {
  selling_id: number;
  record_type: string;
  customer_name: string;
  invoice_no: string | null;
  service_date: string | null;
  selling_amount: number;
  buying_amount: number;
  gross_profit: number;
  gp_margin: number;
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

const ShipmentProfitPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShipmentProfit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size: 50 };
      if (search) params.customer_name = search;
      if (year) params.year = year;
      if (month) params.month = month;

      const res = await api.get('/api/v1/profitability/by-shipment', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, search, year, month]);

  const columns = [
    {
      title: t('analytics:shipmentProfit.columnType'), dataIndex: 'record_type', key: 'type',
      width: 80, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v] || 'default'}>
          {v.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: t('analytics:shipmentProfit.columnCustomer'), dataIndex: 'customer_name', key: 'name',
      ellipsis: true, width: 180,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: t('analytics:shipmentProfit.columnInvoice'), dataIndex: 'invoice_no', key: 'inv',
      ellipsis: true, width: 140,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('analytics:shipmentProfit.columnDate'), dataIndex: 'service_date', key: 'date',
      width: 100,
      render: (v: string | null) => v || '-',
    },
    {
      title: t('analytics:shipmentProfit.columnSelling'), dataIndex: 'selling_amount', key: 'sell',
      width: 130, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('analytics:shipmentProfit.columnBuying'), dataIndex: 'buying_amount', key: 'buy',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: t('analytics:shipmentProfit.columnGp'), dataIndex: 'gross_profit', key: 'gp',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322', fontWeight: 600 }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:shipmentProfit.columnGpRate'), dataIndex: 'gp_margin', key: 'gpm',
      width: 80, align: 'center' as const,
      render: (v: number) => (
        <Tag color={v >= 30 ? 'green' : v >= 15 ? 'orange' : v >= 0 ? 'default' : 'red'}>
          {v.toFixed(1)}%
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
            <ContainerOutlined style={{ marginRight: 8 }} />
            {t('analytics:shipmentProfit.titleCount', { count: total })}
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={v => { setYear(v); setPage(1); }}
              allowClear
              placeholder={t('common:filter.year')}
              style={{ width: 100 }}
              options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
            />
            <Select
              value={month}
              onChange={v => { setMonth(v); setPage(1); }}
              allowClear
              placeholder={t('common:filter.month')}
              style={{ width: 90 }}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1, label: t(`common:month.${i + 1}`),
              }))}
            />
          </Space>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('analytics:shipmentProfit.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 220 }}
        />
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="selling_id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
          loading={loading}
        />
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={50}
            onChange={setPage}
            showTotal={total => t('common:pagination.totalAll', { count: total })}
          />
        </div>
      </Card>
    </div>
  );
};

export default ShipmentProfitPage;

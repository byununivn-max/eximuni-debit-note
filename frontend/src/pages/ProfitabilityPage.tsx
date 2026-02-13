import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Spin, Row, Col, Space, Statistic,
} from 'antd';
import {
  TrophyOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

interface CustomerProfit {
  customer_name: string;
  deal_count: number;
  total_selling: number;
  total_buying: number;
  gross_profit: number;
  gp_margin: number;
}

const fmtNum = (v: number) => {
  if (!v && v !== 0) return '-';
  if (v === 0) return '-';
  return Math.round(v).toLocaleString();
};

const ProfitabilityPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CustomerProfit[]>([]);
  const [year, setYear] = useState<number | undefined>(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { limit: 100 };
      if (year) params.year = year;
      if (month) params.month = month;
      const res = await api.get('/api/v1/profitability/by-customer', { params });
      setItems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month]);

  // 요약 통계
  const totalSelling = items.reduce((s, i) => s + i.total_selling, 0);
  const totalBuying = items.reduce((s, i) => s + i.total_buying, 0);
  const totalGP = items.reduce((s, i) => s + i.gross_profit, 0);
  const avgGPMargin = totalSelling ? (totalGP / totalSelling * 100) : 0;
  const totalDeals = items.reduce((s, i) => s + i.deal_count, 0);

  const columns = [
    {
      title: t('analytics:profitability.columnRank'), key: 'rank', width: 50, fixed: 'left' as const,
      render: (_: any, __: any, idx: number) => (
        <Text strong>{idx + 1}</Text>
      ),
    },
    {
      title: t('analytics:profitability.columnCustomer'), dataIndex: 'customer_name', key: 'name',
      ellipsis: true, fixed: 'left' as const, width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: t('analytics:profitability.columnCount'), dataIndex: 'deal_count', key: 'cnt',
      width: 70, align: 'center' as const,
    },
    {
      title: t('analytics:profitability.columnSelling'), dataIndex: 'total_selling', key: 'sell',
      width: 140, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('analytics:profitability.columnBuying'), dataIndex: 'total_buying', key: 'buy',
      width: 140, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: t('analytics:profitability.columnGrossProfit'), dataIndex: 'gross_profit', key: 'gp',
      width: 140, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322', fontWeight: 600 }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:profitability.columnGpRate'), dataIndex: 'gp_margin', key: 'gpm',
      width: 90, align: 'center' as const,
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
            <TrophyOutlined style={{ marginRight: 8 }} />
            {t('analytics:profitability.title')}
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
              value={month}
              onChange={setMonth}
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

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic title={t('analytics:profitability.customerCount')} value={items.length} suffix="개사" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic title={t('analytics:profitability.totalDeals')} value={totalDeals} suffix="건" />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title={t('analytics:profitability.totalSelling')}
              value={totalSelling}
              precision={0}
              formatter={(val) => fmtNum(Number(val))}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title={t('analytics:profitability.totalBuying')}
              value={totalBuying}
              precision={0}
              formatter={(val) => fmtNum(Number(val))}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title={t('analytics:profitability.totalGp')}
              value={totalGP}
              precision={0}
              formatter={(val) => fmtNum(Number(val))}
              valueStyle={{ color: totalGP >= 0 ? '#3f8600' : '#cf1322' }}
              prefix={totalGP >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title={t('analytics:profitability.avgGpRate')}
              value={avgGPMargin}
              precision={1}
              suffix="%"
              valueStyle={{
                color: avgGPMargin >= 20 ? '#3f8600' : '#d46b08',
              }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={t('analytics:profitability.rankingTitle', { count: items.length })}
        size="small"
      >
        <Table
          columns={columns}
          dataSource={items}
          rowKey="customer_name"
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default ProfitabilityPage;

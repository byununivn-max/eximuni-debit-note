import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Statistic, Typography, Table, Tag, Spin, Select,
  DatePicker, Space,
} from 'antd';
import {
  RiseOutlined, FallOutlined, DollarOutlined,
  ShoppingCartOutlined, FundOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { Column } from '@ant-design/charts';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Kpi, MonthlyItem, CustomerItem } from '../types/dashboard';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DashboardPage: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [monthly, setMonthly] = useState<MonthlyItem[]>([]);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kpiRes, monthlyRes, custRes] = await Promise.all([
        api.get('/api/v1/dashboard/kpi'),
        api.get('/api/v1/dashboard/monthly-trend', {
          params: { year },
        }),
        api.get('/api/v1/dashboard/customer-profit', {
          params: { limit: 10 },
        }),
      ]);
      setKpi(kpiRes.data);
      setMonthly(monthlyRes.data);
      setCustomers(custRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  if (loading) {
    return (
      <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
    );
  }

  // 차트 데이터 변환
  const chartData = monthly.flatMap(m => [
    { month: t(`common:month.${m.month}`), type: t('dashboard:chartSelling'), value: m.selling },
    { month: t(`common:month.${m.month}`), type: t('dashboard:chartBuying'), value: m.buying },
    { month: t(`common:month.${m.month}`), type: t('dashboard:chartProfit'), value: m.profit },
  ]);

  const chartConfig = {
    data: chartData,
    xField: 'month',
    yField: 'value',
    colorField: 'type',
    group: true,
    style: { maxWidth: 40 },
    scale: {
      color: {
        range: ['#52c41a', '#ff4d4f', '#1890ff'],
      },
    },
    axis: {
      y: {
        labelFormatter: (v: number) => {
          if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
          if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
          if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
          return String(v);
        },
      },
    },
  };

  const customerColumns = [
    {
      title: t('dashboard:columnRank'), key: 'rank', width: 60, align: 'center' as const,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: t('dashboard:columnCustomer'), dataIndex: 'customer_name', key: 'name',
      ellipsis: true,
    },
    {
      title: t('dashboard:columnSalesVnd'), dataIndex: 'total_vnd', key: 'total',
      width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: t('dashboard:columnCount'), dataIndex: 'count', key: 'count',
      width: 70, align: 'center' as const,
    },
  ];

  const profitColor = (kpi?.gross_profit_vnd || 0) >= 0 ? '#52c41a' : '#ff4d4f';

  return (
    <div>
      <Space
        style={{
          width: '100%', justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>{t('dashboard:title')}</Title>
        <Select
          value={year}
          onChange={setYear}
          style={{ width: 100 }}
          options={[
            { value: 2024, label: '2024' },
            { value: 2025, label: '2025' },
            { value: 2026, label: '2026' },
          ]}
        />
      </Space>

      {/* KPI 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard:sellingTotal', { count: kpi?.selling_count || 0 })}
              value={Number(kpi?.total_selling_vnd || 0)}
              prefix={<FundOutlined />}
              valueStyle={{ color: '#52c41a' }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard:buyingTotal', { count: kpi?.buying_count || 0 })}
              value={Number(kpi?.total_buying_vnd || 0)}
              prefix={<ShoppingCartOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard:grossProfit')}
              value={Number(kpi?.gross_profit_vnd || 0)}
              prefix={
                (kpi?.gross_profit_vnd || 0) >= 0
                  ? <RiseOutlined />
                  : <FallOutlined />
              }
              valueStyle={{ color: profitColor }}
              formatter={(v) => Number(v).toLocaleString()}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title={t('dashboard:gpMargin')}
              value={Number(kpi?.gp_margin_pct || 0)}
              prefix={<PercentageOutlined />}
              suffix="%"
              precision={1}
              valueStyle={{ color: profitColor }}
            />
          </Card>
        </Col>
      </Row>

      {/* 월별 추이 차트 */}
      <Card
        title={t('dashboard:monthlyTrend', { year })}
        size="small"
        style={{ marginBottom: 24 }}
      >
        <div style={{ height: 350 }}>
          <Column {...chartConfig} />
        </div>
      </Card>

      {/* 고객별 매출 TOP 10 */}
      <Card title={t('dashboard:customerTop')} size="small">
        <Table
          columns={customerColumns}
          dataSource={customers}
          rowKey="customer_name"
          pagination={false}
          size="small"
          scroll={{ x: 500 }}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;

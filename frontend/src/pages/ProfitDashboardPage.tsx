import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Typography, Table, Spin, Select, Tag,
} from 'antd';
import { Bar } from '@ant-design/charts';
import api from '../services/api';

const { Title } = Typography;

interface CustomerItem {
  customer_name: string;
  total_vnd: number;
  count: number;
}

interface MonthlyItem {
  month: number;
  selling: number;
  buying: number;
  profit: number;
}

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const ProfitDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [monthly, setMonthly] = useState<MonthlyItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [limit, setLimit] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, monthlyRes] = await Promise.all([
        api.get('/api/v1/dashboard/customer-profit', {
          params: { limit },
        }),
        api.get('/api/v1/dashboard/monthly-trend', {
          params: { year },
        }),
      ]);
      setCustomers(custRes.data);
      setMonthly(monthlyRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, limit]);

  if (loading) {
    return (
      <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
    );
  }

  // 고객별 매출 차트 데이터
  const customerChartData = [...customers].reverse().map(c => ({
    customer: c.customer_name?.length > 20
      ? c.customer_name.substring(0, 20) + '...'
      : c.customer_name,
    value: c.total_vnd,
  }));

  const barConfig = {
    data: customerChartData,
    xField: 'customer',
    yField: 'value',
    colorField: 'customer',
    axis: {
      y: {
        labelFormatter: (v: number) => {
          if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
          if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
          return `${(v / 1e3).toFixed(0)}K`;
        },
      },
    },
    legend: false as const,
  };

  // 월별 수익성 테이블
  const monthlyColumns = [
    {
      title: '월', key: 'month', width: 70, align: 'center' as const,
      render: (_: any, r: MonthlyItem) => MONTH_LABELS[r.month],
    },
    {
      title: '매출 (VND)', dataIndex: 'selling', key: 'selling',
      width: 150, align: 'right' as const,
      render: (v: number) => v ? Number(v).toLocaleString() : '-',
    },
    {
      title: '매입 (VND)', dataIndex: 'buying', key: 'buying',
      width: 150, align: 'right' as const,
      render: (v: number) => v ? Number(v).toLocaleString() : '-',
    },
    {
      title: '영업이익 (VND)', dataIndex: 'profit', key: 'profit',
      width: 150, align: 'right' as const,
      render: (v: number) => (
        <span style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f' }}>
          {v ? Number(v).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      title: 'GP 마진', key: 'margin', width: 100, align: 'center' as const,
      render: (_: any, r: MonthlyItem) => {
        if (!r.selling) return '-';
        const margin = ((r.profit / r.selling) * 100).toFixed(1);
        const color = Number(margin) >= 0 ? 'green' : 'red';
        return <Tag color={color}>{margin}%</Tag>;
      },
    },
  ];

  // 고객별 테이블
  const customerColumns = [
    {
      title: '순위', key: 'rank', width: 60, align: 'center' as const,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: '고객명', dataIndex: 'customer_name', key: 'name',
      ellipsis: true,
    },
    {
      title: '매출 (VND)', dataIndex: 'total_vnd', key: 'total',
      width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: '건수', dataIndex: 'count', key: 'count',
      width: 70, align: 'center' as const,
    },
  ];

  return (
    <div>
      <Row
        justify="space-between"
        align="middle"
        style={{ marginBottom: 16 }}
      >
        <Col>
          <Title level={4} style={{ margin: 0 }}>수익성 분석</Title>
        </Col>
        <Col>
          <Select
            value={year}
            onChange={setYear}
            style={{ width: 100, marginRight: 8 }}
            options={[
              { value: 2024, label: '2024' },
              { value: 2025, label: '2025' },
              { value: 2026, label: '2026' },
            ]}
          />
          <Select
            value={limit}
            onChange={setLimit}
            style={{ width: 120 }}
            options={[
              { value: 10, label: 'TOP 10' },
              { value: 20, label: 'TOP 20' },
              { value: 50, label: 'TOP 50' },
            ]}
          />
        </Col>
      </Row>

      {/* 월별 수익성 */}
      <Card
        title={`${year}년 월별 수익성`}
        size="small"
        style={{ marginBottom: 24 }}
      >
        <Table
          columns={monthlyColumns}
          dataSource={monthly}
          rowKey="month"
          pagination={false}
          size="small"
          summary={(data) => {
            const totSell = data.reduce((s, r) => s + r.selling, 0);
            const totBuy = data.reduce((s, r) => s + r.buying, 0);
            const totProfit = totSell - totBuy;
            const margin = totSell > 0
              ? ((totProfit / totSell) * 100).toFixed(1)
              : '0';
            return (
              <Table.Summary.Row
                style={{ fontWeight: 'bold' }}
              >
                <Table.Summary.Cell index={0} align="center">
                  합계
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="right">
                  {totSell.toLocaleString()}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  {totBuy.toLocaleString()}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} align="right">
                  <span
                    style={{
                      color: totProfit >= 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  >
                    {totProfit.toLocaleString()}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="center">
                  <Tag color={Number(margin) >= 0 ? 'green' : 'red'}>
                    {margin}%
                  </Tag>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>

      <Row gutter={24}>
        {/* 고객별 매출 차트 */}
        <Col span={12}>
          <Card
            title={`고객별 매출 TOP ${limit}`}
            size="small"
          >
            <div style={{ height: Math.max(300, customers.length * 28) }}>
              <Bar {...barConfig} />
            </div>
          </Card>
        </Col>

        {/* 고객별 매출 테이블 */}
        <Col span={12}>
          <Card
            title={`고객별 매출 상세 (${customers.length}건)`}
            size="small"
          >
            <Table
              columns={customerColumns}
              dataSource={customers}
              rowKey="customer_name"
              pagination={false}
              size="small"
              scroll={{ y: Math.max(300, customers.length * 28) }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ProfitDashboardPage;

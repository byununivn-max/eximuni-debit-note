import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button,
  Spin, Row, Col, Space, Statistic, Popconfirm, message,
  Divider,
} from 'antd';
import {
  LineChartOutlined, SyncOutlined, RiseOutlined,
  FallOutlined, ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

interface PnLMonth {
  fiscal_month: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  gp_margin: number;
  operating_profit: number;
  net_profit: number;
  net_margin: number;
}

interface YearSummary {
  fiscal_year: number;
  months: PnLMonth[];
  ytd_revenue: number;
  ytd_cogs: number;
  ytd_gross_profit: number;
  ytd_gp_margin: number;
  ytd_operating_profit: number;
  ytd_net_profit: number;
  ytd_net_margin: number;
}

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const fmtNum = (v: number) => {
  if (!v && v !== 0) return '-';
  if (v === 0) return '-';
  return Math.round(v).toLocaleString();
};

const fmtPct = (v: number) => {
  if (!v && v !== 0) return '-';
  return `${v.toFixed(1)}%`;
};

const PnLDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<YearSummary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/pnl/year-summary', {
        params: { fiscal_year: year },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  const handleCalculateYear = async () => {
    setCalculating(true);
    try {
      const res = await api.post(
        '/api/v1/pnl/calculate-year',
        null,
        { params: { fiscal_year: year } },
      );
      message.success(
        `${year}년 P&L 계산 완료: ${res.data.months_calculated}개월`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'P&L 계산 실패');
    } finally {
      setCalculating(false);
    }
  };

  const columns = [
    {
      title: '월', dataIndex: 'fiscal_month', key: 'month',
      width: 60, fixed: 'left' as const,
      render: (v: number) => <strong>{MONTH_LABELS[v]}</strong>,
    },
    {
      title: '매출', dataIndex: 'revenue', key: 'rev',
      width: 130, align: 'right' as const,
      render: (v: number) => <Text strong>{fmtNum(v)}</Text>,
    },
    {
      title: '원가', dataIndex: 'cogs', key: 'cogs',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: '매출총이익', dataIndex: 'gross_profit', key: 'gp',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: 'GP율', dataIndex: 'gp_margin', key: 'gpm',
      width: 80, align: 'center' as const,
      render: (v: number) => (
        <Tag color={v >= 30 ? 'green' : v >= 15 ? 'orange' : 'red'}>
          {fmtPct(v)}
        </Tag>
      ),
    },
    {
      title: '영업이익', dataIndex: 'operating_profit', key: 'op',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: '순이익', dataIndex: 'net_profit', key: 'net',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? '#1890ff' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: '순이익률', dataIndex: 'net_margin', key: 'nm',
      width: 90, align: 'center' as const,
      render: (v: number) => (
        <Tag color={v >= 10 ? 'blue' : v >= 0 ? 'default' : 'red'}>
          {fmtPct(v)}
        </Tag>
      ),
    },
  ];

  if (loading && !data) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <LineChartOutlined style={{ marginRight: 8 }} />
            종합 P&L 대시보드
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 100 }}
              options={[2024, 2025, 2026].map(y => ({
                value: y, label: String(y),
              }))}
            />
            <Popconfirm
              title={`${year}년 전체 P&L 계산 실행? (비용 집계 필요)`}
              onConfirm={handleCalculateYear}
            >
              <Button
                icon={<SyncOutlined spin={calculating} />}
                loading={calculating}
                type="primary"
              >
                연간 P&L 계산
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 매출"
                  value={data.ytd_revenue}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 매출원가"
                  value={data.ytd_cogs}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 매출총이익"
                  value={data.ytd_gross_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: '#3f8600' }}
                  suffix={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ({fmtPct(data.ytd_gp_margin)})
                    </Text>
                  }
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 영업이익"
                  value={data.ytd_operating_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{
                    color: data.ytd_operating_profit >= 0
                      ? '#3f8600' : '#cf1322',
                  }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 순이익"
                  value={data.ytd_net_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{
                    color: data.ytd_net_profit >= 0
                      ? '#1890ff' : '#cf1322',
                  }}
                  prefix={
                    data.ytd_net_profit >= 0
                      ? <ArrowUpOutlined />
                      : <ArrowDownOutlined />
                  }
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title="YTD 순이익률"
                  value={data.ytd_net_margin}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color: data.ytd_net_margin >= 10
                      ? '#1890ff' : data.ytd_net_margin >= 0
                      ? '#d46b08' : '#cf1322',
                  }}
                />
              </Card>
            </Col>
          </Row>

          <Card
            title={`${year}년 월별 손익계산서 (${data.months.length}개월)`}
            size="small"
          >
            <Table
              columns={columns}
              dataSource={data.months}
              rowKey="fiscal_month"
              pagination={false}
              size="small"
              scroll={{ x: 900 }}
              loading={loading}
              summary={() => {
                if (!data || data.months.length === 0) return null;
                return (
                  <Table.Summary.Row
                    style={{ fontWeight: 'bold', background: '#fafafa' }}
                  >
                    <Table.Summary.Cell index={0}>YTD</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">
                      {fmtNum(data.ytd_revenue)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">
                      <span style={{ color: '#cf1322' }}>
                        {fmtNum(data.ytd_cogs)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      <span style={{ color: '#3f8600' }}>
                        {fmtNum(data.ytd_gross_profit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="center">
                      <Tag color="green">{fmtPct(data.ytd_gp_margin)}</Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <span style={{
                        color: data.ytd_operating_profit >= 0
                          ? '#3f8600' : '#cf1322',
                      }}>
                        {fmtNum(data.ytd_operating_profit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} align="right">
                      <span style={{
                        color: data.ytd_net_profit >= 0
                          ? '#1890ff' : '#cf1322',
                      }}>
                        {fmtNum(data.ytd_net_profit)}
                      </span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={7} align="center">
                      <Tag color="blue">{fmtPct(data.ytd_net_margin)}</Tag>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default PnLDashboardPage;

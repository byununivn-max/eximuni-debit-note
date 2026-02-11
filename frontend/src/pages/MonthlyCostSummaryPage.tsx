import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button,
  Spin, Row, Col, Space, Statistic, Popconfirm, message,
} from 'antd';
import {
  BarChartOutlined, SyncOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

interface SummaryItem {
  summary_id: number;
  fiscal_year: number;
  fiscal_month: number;
  account_code: string;
  cost_type: string;
  cost_center_code: string | null;
  total_amount: number;
  daily_allocated_amount: number;
  working_days: number;
}

interface CostByType {
  cost_type: string;
  total_amount: number;
  daily_allocated: number;
  account_count: number;
}

interface Overview {
  fiscal_year: number;
  fiscal_month: number;
  working_days: number;
  by_type: CostByType[];
  grand_total: number;
  grand_daily: number;
}

const TYPE_COLOR: Record<string, string> = {
  fixed: 'red',
  variable: 'green',
  semi_variable: 'orange',
};

const TYPE_LABEL: Record<string, string> = {
  fixed: '고정비',
  variable: '변동비',
  semi_variable: '반변동비',
};

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const fmtNum = (v: number) => {
  if (!v) return '-';
  return Number(v).toLocaleString();
};

const MonthlyCostSummaryPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SummaryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [calculating, setCalculating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        fiscal_year: year, fiscal_month: month,
      };
      if (typeFilter) params.cost_type = typeFilter;

      const [listRes, overviewRes] = await Promise.all([
        api.get('/api/v1/cost-classifications/monthly-summary', { params }),
        api.get('/api/v1/cost-classifications/monthly-overview', {
          params: { fiscal_year: year, fiscal_month: month },
        }),
      ]);
      setItems(listRes.data.items);
      setTotal(listRes.data.total);
      setOverview(overviewRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month, typeFilter]);

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const res = await api.post(
        '/api/v1/cost-classifications/calculate-monthly',
        null,
        { params: { fiscal_year: year, fiscal_month: month } },
      );
      message.success(
        `집계 완료: ${res.data.accounts_processed}개 계정, ${res.data.days_in_month}일`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '집계 실패');
    } finally {
      setCalculating(false);
    }
  };

  const columns = [
    {
      title: '계정코드', dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '비용유형', dataIndex: 'cost_type', key: 'type',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: '비용센터', dataIndex: 'cost_center_code', key: 'cc',
      width: 100, align: 'center' as const,
      render: (v: string | null) => v || '전사',
    },
    {
      title: '월 총액', dataIndex: 'total_amount', key: 'total',
      width: 150, align: 'right' as const,
      render: (v: number) => <strong>{fmtNum(v)}</strong>,
    },
    {
      title: '일할 금액', dataIndex: 'daily_allocated_amount', key: 'daily',
      width: 150, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: '역일수', dataIndex: 'working_days', key: 'days',
      width: 80, align: 'center' as const,
    },
  ];

  if (loading && items.length === 0 && !overview) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BarChartOutlined style={{ marginRight: 8 }} />
            월별 비용 집계
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 100 }}
              options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
            />
            <Select
              value={month}
              onChange={setMonth}
              style={{ width: 90 }}
              options={Array.from({ length: 12 }, (_, i) => ({
                value: i + 1, label: MONTH_LABELS[i + 1],
              }))}
            />
            <Popconfirm
              title={`${year}년 ${MONTH_LABELS[month]} 비용 집계 실행?`}
              onConfirm={handleCalculate}
            >
              <Button
                icon={<SyncOutlined spin={calculating} />}
                loading={calculating}
                type="primary"
              >
                집계 실행
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      {overview && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="총 비용"
                value={Number(overview.grand_total)}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
                suffix="VND"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="일할 합계"
                value={Number(overview.grand_daily)}
                precision={0}
                formatter={(val) => fmtNum(Number(val))}
                suffix="VND/일"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="역일수"
                value={overview.working_days}
                suffix="일"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="비용 계정 수"
                value={total}
                suffix="건"
              />
            </Card>
          </Col>
        </Row>
      )}

      {overview && overview.by_type.length > 0 && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {overview.by_type.map(bt => (
            <Col span={8} key={bt.cost_type}>
              <Card size="small">
                <Tag color={TYPE_COLOR[bt.cost_type]} style={{ marginBottom: 8 }}>
                  {TYPE_LABEL[bt.cost_type]}
                </Tag>
                <div>
                  <Text strong>월 총액: </Text>
                  <Text>{fmtNum(Number(bt.total_amount))}</Text>
                </div>
                <div>
                  <Text strong>일할: </Text>
                  <Text>{fmtNum(Number(bt.daily_allocated))}/일</Text>
                </div>
                <div>
                  <Text type="secondary">{bt.account_count}개 계정</Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="비용유형 필터"
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: 'fixed', label: '고정비' },
            { value: 'variable', label: '변동비' },
            { value: 'semi_variable', label: '반변동비' },
          ]}
        />
      </Space>

      <Card
        title={`${year}년 ${MONTH_LABELS[month]} 비용 집계 (${total}개 계정)`}
        size="small"
      >
        <Table
          columns={columns}
          dataSource={items}
          rowKey="summary_id"
          pagination={false}
          size="small"
          scroll={{ x: 700 }}
          loading={loading}
          summary={() => {
            if (!overview) return null;
            return (
              <Table.Summary.Row style={{ fontWeight: 'bold', background: '#fafafa' }}>
                <Table.Summary.Cell index={0}>합계</Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} align="right">
                  <span style={{ color: '#1890ff' }}>
                    {fmtNum(Number(overview.grand_total))}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <span style={{ color: '#1890ff' }}>
                    {fmtNum(Number(overview.grand_daily))}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="center">
                  {overview.working_days}
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default MonthlyCostSummaryPage;

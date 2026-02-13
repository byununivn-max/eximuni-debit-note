import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button,
  Spin, Row, Col, Space, Statistic, Popconfirm, message,
} from 'antd';
import {
  BarChartOutlined, SyncOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
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

const fmtNum = (v: number) => {
  if (!v) return '-';
  return Number(v).toLocaleString();
};

const MonthlyCostSummaryPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);

  const TYPE_LABEL: Record<string, string> = {
    fixed: t('common:costType.fixed'),
    variable: t('common:costType.variable'),
    semi_variable: t('common:costType.semi_variable'),
  };

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
        t('analytics:monthlyCost.calculateSuccess', {
          accounts: res.data.accounts_processed,
          days: res.data.days_in_month,
        }),
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
    } finally {
      setCalculating(false);
    }
  };

  const columns = [
    {
      title: t('analytics:monthlyCost.columnAccountCode'), dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('analytics:monthlyCost.columnCostType'), dataIndex: 'cost_type', key: 'type',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: t('analytics:monthlyCost.columnCostCenter'), dataIndex: 'cost_center_code', key: 'cc',
      width: 100, align: 'center' as const,
      render: (v: string | null) => v || t('analytics:costClassification.companyWide'),
    },
    {
      title: t('analytics:monthlyCost.columnMonthlyTotal'), dataIndex: 'total_amount', key: 'total',
      width: 150, align: 'right' as const,
      render: (v: number) => <strong>{fmtNum(v)}</strong>,
    },
    {
      title: t('analytics:monthlyCost.columnDailyAmount'), dataIndex: 'daily_allocated_amount', key: 'daily',
      width: 150, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('analytics:monthlyCost.columnDays'), dataIndex: 'working_days', key: 'days',
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
            {t('analytics:monthlyCost.title')}
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
                value: i + 1, label: t(`common:month.${i + 1}`),
              }))}
            />
            <Popconfirm
              title={t('analytics:monthlyCost.calculateConfirm', { year, month: t(`common:month.${month}`) })}
              onConfirm={handleCalculate}
            >
              <Button
                icon={<SyncOutlined spin={calculating} />}
                loading={calculating}
                type="primary"
              >
                {t('analytics:monthlyCost.calculateButton')}
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
                title={t('analytics:monthlyCost.totalCost')}
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
                title={t('analytics:monthlyCost.dailyTotal')}
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
                title={t('analytics:monthlyCost.calendarDays')}
                value={overview.working_days}
                suffix="일"
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title={t('analytics:monthlyCost.costAccounts')}
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
                  <Text strong>{t('analytics:monthlyCost.monthlyTotal')}: </Text>
                  <Text>{fmtNum(Number(bt.total_amount))}</Text>
                </div>
                <div>
                  <Text strong>{t('analytics:monthlyCost.dailyAmount')}: </Text>
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
          placeholder={t('analytics:monthlyCost.typeFilter')}
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: 'fixed', label: t('common:costType.fixed') },
            { value: 'variable', label: t('common:costType.variable') },
            { value: 'semi_variable', label: t('common:costType.semi_variable') },
          ]}
        />
      </Space>

      <Card
        title={t('analytics:monthlyCost.cardTitle', { year, month: t(`common:month.${month}`), count: total })}
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
                <Table.Summary.Cell index={0}>{t('common:table.total')}</Table.Summary.Cell>
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

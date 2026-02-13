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
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { YearSummary } from '../types/pnl';

const { Title, Text } = Typography;

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
  const { t } = useTranslation(['analytics', 'common']);
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
        t('analytics:pnl.calculateSuccess', { year, months: res.data.months_calculated }),
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
      title: t('analytics:pnl.columnMonth'), dataIndex: 'fiscal_month', key: 'month',
      width: 60, fixed: 'left' as const,
      render: (v: number) => <strong>{t(`common:month.${v}`)}</strong>,
    },
    {
      title: t('analytics:pnl.columnRevenue'), dataIndex: 'revenue', key: 'rev',
      width: 130, align: 'right' as const,
      render: (v: number) => <Text strong>{fmtNum(v)}</Text>,
    },
    {
      title: t('analytics:pnl.columnCogs'), dataIndex: 'cogs', key: 'cogs',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text type="danger">{fmtNum(v)}</Text>
      ),
    },
    {
      title: t('analytics:pnl.columnGrossProfit'), dataIndex: 'gross_profit', key: 'gp',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:pnl.columnGpRate'), dataIndex: 'gp_margin', key: 'gpm',
      width: 80, align: 'center' as const,
      render: (v: number) => (
        <Tag color={v >= 30 ? 'green' : v >= 15 ? 'orange' : 'red'}>
          {fmtPct(v)}
        </Tag>
      ),
    },
    {
      title: t('analytics:pnl.columnOperatingProfit'), dataIndex: 'operating_profit', key: 'op',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? '#3f8600' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:pnl.columnNetProfit'), dataIndex: 'net_profit', key: 'net',
      width: 130, align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? '#1890ff' : '#cf1322' }}>
          {fmtNum(v)}
        </Text>
      ),
    },
    {
      title: t('analytics:pnl.columnNetMarginRate'), dataIndex: 'net_margin', key: 'nm',
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
            {t('analytics:pnl.title')}
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
              title={t('analytics:pnl.calculateConfirm', { year })}
              onConfirm={handleCalculateYear}
            >
              <Button
                icon={<SyncOutlined spin={calculating} />}
                loading={calculating}
                type="primary"
              >
                {t('analytics:pnl.calculateButton')}
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
                  title={t('analytics:pnl.ytdRevenue')}
                  value={data.ytd_revenue}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card size="small">
                <Statistic
                  title={t('analytics:pnl.ytdCogs')}
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
                  title={t('analytics:pnl.ytdGrossProfit')}
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
                  title={t('analytics:pnl.ytdOperatingProfit')}
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
                  title={t('analytics:pnl.ytdNetProfit')}
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
                  title={t('analytics:pnl.ytdNetMargin')}
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
            title={t('analytics:pnl.monthlyTitle', { year, count: data.months.length })}
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

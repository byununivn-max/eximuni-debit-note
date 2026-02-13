import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Spin, Row, Col, Space,
} from 'antd';
import { CalculatorOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

interface TrialItem {
  account_code: string;
  account_name_kr: string | null;
  account_name_en: string | null;
  account_type: string | null;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

interface TrialData {
  fiscal_year: number;
  fiscal_month: number;
  items: TrialItem[];
  totals: TrialItem;
}

const TYPE_COLOR: Record<string, string> = {
  asset: 'blue', liability: 'red', equity: 'purple',
  revenue: 'green', expense: 'orange',
};

const fmtNum = (v: number) => {
  if (!v) return '-';
  return Number(v).toLocaleString();
};

const TrialBalancePage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TrialData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/account-balances/trial-balance', {
        params: { fiscal_year: year, fiscal_month: month },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year, month]);

  const columns = [
    {
      title: t('accounting:trialBalance.columnAccountCode'), dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('accounting:trialBalance.columnAccountName'), dataIndex: 'account_name_kr', key: 'name',
      width: 160,
      render: (v: string | null, r: TrialItem) => v || r.account_name_en || '-',
    },
    {
      title: t('accounting:trialBalance.columnType'), dataIndex: 'account_type', key: 'type',
      width: 70, align: 'center' as const,
      render: (v: string) => v
        ? <Tag color={TYPE_COLOR[v]}>{t(`common:accountType.${v}`, v)}</Tag>
        : '-',
    },
    {
      title: t('accounting:trialBalance.columnOpeningDebit'), dataIndex: 'opening_debit', key: 'od',
      width: 120, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('accounting:trialBalance.columnOpeningCredit'), dataIndex: 'opening_credit', key: 'oc',
      width: 120, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('accounting:trialBalance.columnPeriodDebit'), dataIndex: 'period_debit', key: 'pd',
      width: 120, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('accounting:trialBalance.columnPeriodCredit'), dataIndex: 'period_credit', key: 'pc',
      width: 120, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: t('accounting:trialBalance.columnClosingDebit'), dataIndex: 'closing_debit', key: 'cd',
      width: 120, align: 'right' as const,
      render: (v: number) => (
        <strong>{fmtNum(v)}</strong>
      ),
    },
    {
      title: t('accounting:trialBalance.columnClosingCredit'), dataIndex: 'closing_credit', key: 'cc',
      width: 120, align: 'right' as const,
      render: (v: number) => (
        <strong>{fmtNum(v)}</strong>
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
            <CalculatorOutlined style={{ marginRight: 8 }} />
            {t('accounting:trialBalance.title')}
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
          </Space>
        </Col>
      </Row>

      <Card
        title={t('accounting:trialBalance.cardTitle', { year, month: t(`common:month.${month}`), count: data?.items.length || 0 })}
        size="small"
      >
        <Table
          columns={columns}
          dataSource={data?.items || []}
          rowKey="account_code"
          pagination={false}
          size="small"
          scroll={{ x: 1100 }}
          loading={loading}
          summary={() => {
            if (!data?.totals) return null;
            const totals = data.totals;
            return (
              <Table.Summary.Row style={{ fontWeight: 'bold', background: '#fafafa' }}>
                <Table.Summary.Cell index={0}>{t('common:table.total')}</Table.Summary.Cell>
                <Table.Summary.Cell index={1} />
                <Table.Summary.Cell index={2} />
                <Table.Summary.Cell index={3} align="right">
                  {fmtNum(totals.opening_debit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  {fmtNum(totals.opening_credit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  {fmtNum(totals.period_debit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} align="right">
                  {fmtNum(totals.period_credit)}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} align="right">
                  <span style={{ color: '#1890ff' }}>
                    {fmtNum(totals.closing_debit)}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8} align="right">
                  <span style={{ color: '#1890ff' }}>
                    {fmtNum(totals.closing_credit)}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default TrialBalancePage;

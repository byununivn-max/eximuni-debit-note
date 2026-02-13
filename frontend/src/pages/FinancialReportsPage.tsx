import React, { useState } from 'react';
import {
  Card, Table, Select, Typography, Button, Input,
  Spin, Row, Col, Space, Statistic, Tabs, Tag,
  message, Descriptions, Collapse,
} from 'antd';
import {
  FileTextOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

const { Title, Text } = Typography;

const fmtNum = (v: number) => {
  if (!v && v !== 0) return '-';
  if (v === 0) return '-';
  return Math.round(v).toLocaleString();
};

/** 대차대조표 탭 */
const BalanceSheetTab: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(12);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/reports/balance-sheet', {
        params: { fiscal_year: year, fiscal_month: month },
      });
      setData(res.data);
    } catch (err) {
      message.error(t('accounting:financialReports.bsFetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const detailColumns = [
    { title: t('accounting:financialReports.columnAccountCode'), dataIndex: 'account_code', key: 'code', width: 120 },
    {
      title: t('accounting:financialReports.columnAccountName'), dataIndex: 'account_name', key: 'name',
      ellipsis: true,
    },
    {
      title: t('accounting:financialReports.columnAmount'), dataIndex: 'amount', key: 'amt',
      width: 150, align: 'right' as const,
      render: (v: number, r: any) => (
        <Text style={{
          color: r.side === 'credit' ? '#cf1322' : undefined,
        }}>
          {fmtNum(v)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
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
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          {t('common:button.query')}
        </Button>
      </Space>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.totalAssets')}
                  value={data.assets.total_assets}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.totalLiabilities')}
                  value={data.liabilities.total_liabilities}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.totalEquity')}
                  value={data.equity.total_equity}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
          </Row>

          {data.balance_check !== 0 && (
            <Tag color="red" style={{ marginBottom: 16 }}>
              {t('accounting:financialReports.balanceCheck', { amount: fmtNum(data.balance_check) })}
            </Tag>
          )}

          <Collapse
            defaultActiveKey={['assets', 'liabilities', 'equity']}
            items={[
              {
                key: 'assets',
                label: t('accounting:financialReports.assets', { amount: fmtNum(data.assets.total_assets) }),
                children: (
                  <div>
                    <Descriptions size="small" bordered column={2}>
                      <Descriptions.Item label={t('accounting:financialReports.currentAssets')}>
                        {fmtNum(data.assets.current_assets)}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('accounting:financialReports.noncurrentAssets')}>
                        {fmtNum(data.assets.noncurrent_assets)}
                      </Descriptions.Item>
                    </Descriptions>
                    <Table
                      columns={detailColumns}
                      dataSource={data.assets.details}
                      rowKey="account_code"
                      size="small"
                      pagination={false}
                      style={{ marginTop: 8 }}
                    />
                  </div>
                ),
              },
              {
                key: 'liabilities',
                label: t('accounting:financialReports.liabilities', { amount: fmtNum(data.liabilities.total_liabilities) }),
                children: (
                  <div>
                    <Descriptions size="small" bordered column={2}>
                      <Descriptions.Item label={t('accounting:financialReports.currentLiabilities')}>
                        {fmtNum(data.liabilities.current_liabilities)}
                      </Descriptions.Item>
                      <Descriptions.Item label={t('accounting:financialReports.noncurrentLiabilities')}>
                        {fmtNum(data.liabilities.noncurrent_liabilities)}
                      </Descriptions.Item>
                    </Descriptions>
                    <Table
                      columns={detailColumns}
                      dataSource={data.liabilities.details}
                      rowKey="account_code"
                      size="small"
                      pagination={false}
                      style={{ marginTop: 8 }}
                    />
                  </div>
                ),
              },
              {
                key: 'equity',
                label: t('accounting:financialReports.equity', { amount: fmtNum(data.equity.total_equity) }),
                children: (
                  <Table
                    columns={detailColumns}
                    dataSource={data.equity.details}
                    rowKey="account_code"
                    size="small"
                    pagination={false}
                  />
                ),
              },
            ]}
          />
        </>
      )}
    </div>
  );
};

/** 손익계산서 탭 */
const IncomeStatementTab: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(12);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { fiscal_year: year };
      if (month) params.fiscal_month = month;
      const res = await api.get('/api/v1/reports/income-statement', { params });
      setData(res.data);
    } catch (err) {
      message.error(t('accounting:financialReports.isFetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={year}
          onChange={setYear}
          style={{ width: 100 }}
          options={[2024, 2025, 2026].map(y => ({ value: y, label: String(y) }))}
        />
        <Select
          value={month}
          onChange={setMonth}
          allowClear
          placeholder={t('accounting:financialReports.cumulative')}
          style={{ width: 90 }}
          options={Array.from({ length: 12 }, (_, i) => ({
            value: i + 1, label: t(`common:month.${i + 1}`),
          }))}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          {t('common:button.query')}
        </Button>
      </Space>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.netRevenue')}
                  value={data.revenue.net_revenue}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.grossProfit')}
                  value={data.gross_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: data.gross_profit >= 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.operatingProfit')}
                  value={data.operating_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: data.operating_profit >= 0 ? '#3f8600' : '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title={t('accounting:financialReports.netProfit')}
                  value={data.net_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: data.net_profit >= 0 ? '#3f8600' : '#cf1322' }}
                  prefix={data.net_profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" title={t('accounting:financialReports.incomeStatementTitle', { period: data.period })}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label={t('accounting:financialReports.grossRevenue')} span={1}>
                {fmtNum(data.revenue.gross_revenue)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.deductions')} span={1}>
                <Text type="danger">{fmtNum(data.revenue.deductions)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.netRevenue')} span={2}>
                <Text strong>{fmtNum(data.revenue.net_revenue)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.cogs')} span={2}>
                <Text type="danger">{fmtNum(data.cogs)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.grossProfit')} span={2}>
                <Text strong style={{
                  color: data.gross_profit >= 0 ? '#3f8600' : '#cf1322',
                }}>
                  {fmtNum(data.gross_profit)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.sellingExpenses')}>
                {fmtNum(data.operating_expenses.selling)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.adminExpenses')}>
                {fmtNum(data.operating_expenses.admin)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.operatingProfit')} span={2}>
                <Text strong style={{
                  color: data.operating_profit >= 0 ? '#3f8600' : '#cf1322',
                }}>
                  {fmtNum(data.operating_profit)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.financialIncome')}>
                {fmtNum(data.financial.income)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.financialExpense')}>
                <Text type="danger">{fmtNum(data.financial.expense)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.otherIncome')}>
                {fmtNum(data.other.income)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.otherExpense')}>
                <Text type="danger">{fmtNum(data.other.expense)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.profitBeforeTax')} span={2}>
                {fmtNum(data.profit_before_tax)}
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.incomeTax')} span={2}>
                <Text type="danger">{fmtNum(data.income_tax)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('accounting:financialReports.netProfit')} span={2}>
                <Text strong style={{
                  fontSize: 16,
                  color: data.net_profit >= 0 ? '#3f8600' : '#cf1322',
                }}>
                  {fmtNum(data.net_profit)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </>
      )}
    </div>
  );
};

/** AR/AP 연령분석 탭 */
const AgingTab: React.FC<{ type: 'ar' | 'ap' }> = ({ type }) => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(12);

  const fetch = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'ar' ? 'ar-aging' : 'ap-aging';
      const res = await api.get(`/api/v1/reports/${endpoint}`, {
        params: { fiscal_year: year, fiscal_month: month },
      });
      setItems(res.data);
    } catch (err) {
      message.error(t('accounting:financialReports.agingFetchFailed', { type: type.toUpperCase() }));
    } finally {
      setLoading(false);
    }
  };

  const isAR = type === 'ar';
  const idField = isAR ? 'customer_id' : 'vendor_id';
  const nameField = isAR ? 'customer_name' : 'vendor_name';
  const amtField = isAR ? 'receivable' : 'payable';
  const total = items.reduce((s, i) => s + (i[amtField] || 0), 0);

  const columns = [
    {
      title: '#', key: 'rank', width: 50,
      render: (_: any, __: any, idx: number) => idx + 1,
    },
    {
      title: t('accounting:financialReports.taxId'),
      dataIndex: idField, key: 'id', width: 140,
    },
    {
      title: isAR ? t('accounting:financialReports.customerName') : t('accounting:financialReports.vendorName'),
      dataIndex: nameField, key: 'name',
      ellipsis: true, width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: isAR ? t('accounting:financialReports.arReceivable') : t('accounting:financialReports.apPayable'),
      dataIndex: amtField, key: 'amt',
      width: 160, align: 'right' as const,
      render: (v: number) => (
        <Text style={{
          color: isAR ? '#3f8600' : '#cf1322',
          fontWeight: 600,
        }}>
          {fmtNum(v)}
        </Text>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
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
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          {t('common:button.query')}
        </Button>
      </Space>

      {items.length > 0 && (
        <Card
          size="small"
          title={isAR
            ? t('accounting:financialReports.arTitle', { count: items.length })
            : t('accounting:financialReports.apTitle', { count: items.length })}
          extra={
            <Text strong style={{
              color: isAR ? '#3f8600' : '#cf1322',
            }}>
              {t('common:table.total')}: {fmtNum(total)}
            </Text>
          }
        >
          <Table
            columns={columns}
            dataSource={items}
            rowKey={idField}
            size="small"
            pagination={false}
            loading={loading}
          />
        </Card>
      )}
    </div>
  );
};

/** GL 원장 탭 */
const GLDetailTab: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [accountCode, setAccountCode] = useState('');
  const [page, setPage] = useState(1);

  const fetch = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        fiscal_year: year, page, size: 100,
      };
      if (month) params.fiscal_month = month;
      if (accountCode) params.account_code = accountCode;
      const res = await api.get('/api/v1/reports/gl-detail', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      message.error(t('accounting:financialReports.glFetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: t('accounting:financialReports.columnEntryNumber'), dataIndex: 'entry_number', key: 'num',
      width: 130,
    },
    {
      title: t('accounting:financialReports.columnDate'), dataIndex: 'entry_date', key: 'date',
      width: 100,
    },
    {
      title: t('accounting:financialReports.columnModule'), dataIndex: 'module', key: 'mod',
      width: 60, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('accounting:financialReports.columnAccount'), dataIndex: 'account_code', key: 'acct',
      width: 90,
    },
    {
      title: t('accounting:financialReports.columnCounterAccount'), dataIndex: 'counter_account', key: 'counter',
      width: 90,
    },
    {
      title: t('accounting:financialReports.columnDescription'), dataIndex: 'description', key: 'desc',
      ellipsis: true,
    },
    {
      title: t('accounting:financialReports.columnDebit'), dataIndex: 'debit', key: 'dr',
      width: 140, align: 'right' as const,
      render: (v: number) => v ? fmtNum(v) : '-',
    },
    {
      title: t('accounting:financialReports.columnCredit'), dataIndex: 'credit', key: 'cr',
      width: 140, align: 'right' as const,
      render: (v: number) => v ? (
        <Text type="danger">{fmtNum(v)}</Text>
      ) : '-',
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          value={year}
          onChange={v => { setYear(v); setPage(1); }}
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
        <Input
          placeholder={t('accounting:financialReports.accountCodePlaceholder')}
          value={accountCode}
          onChange={e => setAccountCode(e.target.value)}
          style={{ width: 120 }}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          {t('common:button.query')}
        </Button>
      </Space>

      <Card size="small" title={t('accounting:financialReports.glTitle', { count: total })}>
        <Table
          columns={columns}
          dataSource={items}
          rowKey="line_id"
          size="small"
          pagination={{
            current: page,
            total,
            pageSize: 100,
            onChange: p => { setPage(p); fetch(); },
            showTotal: (total) => t('common:pagination.totalAll', { count: total }),
          }}
          scroll={{ x: 1100 }}
          loading={loading}
        />
      </Card>
    </div>
  );
};

const FinancialReportsPage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        {t('accounting:financialReports.title')}
      </Title>

      <Tabs
        defaultActiveKey="bs"
        items={[
          {
            key: 'bs',
            label: t('accounting:financialReports.balanceSheet'),
            children: <BalanceSheetTab />,
          },
          {
            key: 'is',
            label: t('accounting:financialReports.incomeStatement'),
            children: <IncomeStatementTab />,
          },
          {
            key: 'gl',
            label: t('accounting:financialReports.glDetail'),
            children: <GLDetailTab />,
          },
          {
            key: 'ar',
            label: t('accounting:financialReports.arAging'),
            children: <AgingTab type="ar" />,
          },
          {
            key: 'ap',
            label: t('accounting:financialReports.apAging'),
            children: <AgingTab type="ap" />,
          },
        ]}
      />
    </div>
  );
};

export default FinancialReportsPage;

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
import api from '../services/api';

const { Title, Text } = Typography;

const fmtNum = (v: number) => {
  if (!v && v !== 0) return '-';
  if (v === 0) return '-';
  return Math.round(v).toLocaleString();
};

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

/** 대차대조표 탭 */
const BalanceSheetTab: React.FC = () => {
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
      message.error('대차대조표 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const detailColumns = [
    { title: '계정코드', dataIndex: 'account_code', key: 'code', width: 120 },
    {
      title: '계정명', dataIndex: 'account_name', key: 'name',
      ellipsis: true,
    },
    {
      title: '금액', dataIndex: 'amount', key: 'amt',
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
            value: i + 1, label: MONTH_LABELS[i + 1],
          }))}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          조회
        </Button>
      </Space>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="총 자산"
                  value={data.assets.total_assets}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic
                  title="총 부채"
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
                  title="자본"
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
              균형 차이: {fmtNum(data.balance_check)} (자산 - 부채 - 자본)
            </Tag>
          )}

          <Collapse
            defaultActiveKey={['assets', 'liabilities', 'equity']}
            items={[
              {
                key: 'assets',
                label: `자산 (${fmtNum(data.assets.total_assets)})`,
                children: (
                  <div>
                    <Descriptions size="small" bordered column={2}>
                      <Descriptions.Item label="유동자산">
                        {fmtNum(data.assets.current_assets)}
                      </Descriptions.Item>
                      <Descriptions.Item label="비유동자산">
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
                label: `부채 (${fmtNum(data.liabilities.total_liabilities)})`,
                children: (
                  <div>
                    <Descriptions size="small" bordered column={2}>
                      <Descriptions.Item label="유동부채">
                        {fmtNum(data.liabilities.current_liabilities)}
                      </Descriptions.Item>
                      <Descriptions.Item label="비유동부채">
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
                label: `자본 (${fmtNum(data.equity.total_equity)})`,
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
      message.error('손익계산서 조회 실패');
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
          placeholder="누적"
          style={{ width: 90 }}
          options={Array.from({ length: 12 }, (_, i) => ({
            value: i + 1, label: MONTH_LABELS[i + 1],
          }))}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          조회
        </Button>
      </Space>

      {data && (
        <>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="순매출"
                  value={data.revenue.net_revenue}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card size="small">
                <Statistic
                  title="매출총이익"
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
                  title="영업이익"
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
                  title="순이익"
                  value={data.net_profit}
                  precision={0}
                  formatter={(val) => fmtNum(Number(val))}
                  valueStyle={{ color: data.net_profit >= 0 ? '#3f8600' : '#cf1322' }}
                  prefix={data.net_profit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                />
              </Card>
            </Col>
          </Row>

          <Card size="small" title={`${data.period} 손익계산서`}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="총매출" span={1}>
                {fmtNum(data.revenue.gross_revenue)}
              </Descriptions.Item>
              <Descriptions.Item label="매출차감" span={1}>
                <Text type="danger">{fmtNum(data.revenue.deductions)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="순매출" span={2}>
                <Text strong>{fmtNum(data.revenue.net_revenue)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="매출원가" span={2}>
                <Text type="danger">{fmtNum(data.cogs)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="매출총이익" span={2}>
                <Text strong style={{
                  color: data.gross_profit >= 0 ? '#3f8600' : '#cf1322',
                }}>
                  {fmtNum(data.gross_profit)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="판매비">
                {fmtNum(data.operating_expenses.selling)}
              </Descriptions.Item>
              <Descriptions.Item label="관리비">
                {fmtNum(data.operating_expenses.admin)}
              </Descriptions.Item>
              <Descriptions.Item label="영업이익" span={2}>
                <Text strong style={{
                  color: data.operating_profit >= 0 ? '#3f8600' : '#cf1322',
                }}>
                  {fmtNum(data.operating_profit)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="금융수익">
                {fmtNum(data.financial.income)}
              </Descriptions.Item>
              <Descriptions.Item label="금융비용">
                <Text type="danger">{fmtNum(data.financial.expense)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="기타수익">
                {fmtNum(data.other.income)}
              </Descriptions.Item>
              <Descriptions.Item label="기타비용">
                <Text type="danger">{fmtNum(data.other.expense)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="세전이익" span={2}>
                {fmtNum(data.profit_before_tax)}
              </Descriptions.Item>
              <Descriptions.Item label="법인세" span={2}>
                <Text type="danger">{fmtNum(data.income_tax)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="순이익" span={2}>
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
      message.error(`${type.toUpperCase()} 연령분석 조회 실패`);
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
      title: isAR ? '사업자번호' : '사업자번호',
      dataIndex: idField, key: 'id', width: 140,
    },
    {
      title: isAR ? '고객명' : '공급사명',
      dataIndex: nameField, key: 'name',
      ellipsis: true, width: 200,
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: isAR ? '매출채권' : '매입채무',
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
            value: i + 1, label: MONTH_LABELS[i + 1],
          }))}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          조회
        </Button>
      </Space>

      {items.length > 0 && (
        <Card
          size="small"
          title={`${isAR ? 'AR 매출채권' : 'AP 매입채무'} (${items.length}건)`}
          extra={
            <Text strong style={{
              color: isAR ? '#3f8600' : '#cf1322',
            }}>
              합계: {fmtNum(total)}
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
      message.error('계정별 원장 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: '전표번호', dataIndex: 'entry_number', key: 'num',
      width: 130,
    },
    {
      title: '일자', dataIndex: 'entry_date', key: 'date',
      width: 100,
    },
    {
      title: '모듈', dataIndex: 'module', key: 'mod',
      width: 60, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '계정', dataIndex: 'account_code', key: 'acct',
      width: 90,
    },
    {
      title: '상대계정', dataIndex: 'counter_account', key: 'counter',
      width: 90,
    },
    {
      title: '적요', dataIndex: 'description', key: 'desc',
      ellipsis: true,
    },
    {
      title: '차변', dataIndex: 'debit', key: 'dr',
      width: 140, align: 'right' as const,
      render: (v: number) => v ? fmtNum(v) : '-',
    },
    {
      title: '대변', dataIndex: 'credit', key: 'cr',
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
          placeholder="월"
          style={{ width: 90 }}
          options={Array.from({ length: 12 }, (_, i) => ({
            value: i + 1, label: MONTH_LABELS[i + 1],
          }))}
        />
        <Input
          placeholder="계정코드"
          value={accountCode}
          onChange={e => setAccountCode(e.target.value)}
          style={{ width: 120 }}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={fetch} loading={loading}>
          조회
        </Button>
      </Space>

      <Card size="small" title={`계정별 원장 (${total}건)`}>
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
            showTotal: t => `전체 ${t}건`,
          }}
          scroll={{ x: 1100 }}
          loading={loading}
        />
      </Card>
    </div>
  );
};

const FinancialReportsPage: React.FC = () => {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        재무제표 (SmartBooks VAS 형식)
      </Title>

      <Tabs
        defaultActiveKey="bs"
        items={[
          {
            key: 'bs',
            label: 'B01 대차대조표',
            children: <BalanceSheetTab />,
          },
          {
            key: 'is',
            label: 'B02 손익계산서',
            children: <IncomeStatementTab />,
          },
          {
            key: 'gl',
            label: '계정별 원장',
            children: <GLDetailTab />,
          },
          {
            key: 'ar',
            label: 'AR 연령분석',
            children: <AgingTab type="ar" />,
          },
          {
            key: 'ap',
            label: 'AP 연령분석',
            children: <AgingTab type="ap" />,
          },
        ]}
      />
    </div>
  );
};

export default FinancialReportsPage;

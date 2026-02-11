import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Space, Typography, Button,
  Spin, Row, Col, Statistic, Modal, Descriptions, Pagination,
} from 'antd';
import {
  SearchOutlined, BookOutlined, CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

interface JournalListItem {
  entry_id: number;
  entry_number: string;
  module: string;
  fiscal_year: number;
  fiscal_month: number;
  entry_date: string;
  description_vn: string | null;
  description_kr: string | null;
  currency_code: string;
  total_debit: number;
  total_credit: number;
  status: string;
  source: string;
  vendor_id: string | null;
  customer_id: string | null;
  created_at: string;
}

interface JournalLine {
  line_id: number;
  line_number: number;
  account_code: string;
  description_vn: string | null;
  description_en: string | null;
  debit_amount: number;
  credit_amount: number;
  vendor_id: string | null;
  customer_id: string | null;
  tax_code: string | null;
  tax_amount: number | null;
}

interface JournalDetail extends JournalListItem {
  voucher_date: string | null;
  description_en: string | null;
  exchange_rate: number | null;
  smartbooks_batch_nbr: string | null;
  employee_id: string | null;
  invoice_no: string | null;
  lines: JournalLine[];
}

interface Summary {
  by_module: Record<string, number>;
  by_status: Record<string, number>;
  total_debit: number;
  total_credit: number;
  total_entries: number;
}

const MODULE_COLOR: Record<string, string> = {
  GL: 'blue', AP: 'red', AR: 'green', CA: 'orange', OF: 'purple',
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  draft: { color: 'default', label: '초안' },
  posted: { color: 'green', label: '게시됨' },
  reversed: { color: 'red', label: '역분개' },
};

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const JournalEntriesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<JournalListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [page, setPage] = useState(1);
  const [size] = useState(50);
  const [module, setModule] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [detail, setDetail] = useState<JournalDetail | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size };
      if (module) params.module = module;
      if (status) params.status = status;
      if (year) params.fiscal_year = year;
      if (search) params.search = search;

      const [listRes, sumRes] = await Promise.all([
        api.get('/api/v1/journal-entries', { params }),
        api.get('/api/v1/journal-entries/summary', {
          params: year ? { fiscal_year: year } : {},
        }),
      ]);
      setItems(listRes.data.items);
      setTotal(listRes.data.total);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, module, status, year, search]);

  const showDetail = async (entryId: number) => {
    try {
      const res = await api.get(`/api/v1/journal-entries/${entryId}`);
      setDetail(res.data);
      setDetailVisible(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fmtNum = (v: number) => Number(v).toLocaleString();

  const columns = [
    {
      title: '전표번호', dataIndex: 'entry_number', key: 'number',
      width: 140, fixed: 'left' as const,
      render: (v: string, r: JournalListItem) => (
        <a onClick={() => showDetail(r.entry_id)}>{v}</a>
      ),
    },
    {
      title: '모듈', dataIndex: 'module', key: 'module',
      width: 70, align: 'center' as const,
      render: (v: string) => <Tag color={MODULE_COLOR[v]}>{v}</Tag>,
    },
    {
      title: '기간', key: 'period', width: 100,
      render: (_: any, r: JournalListItem) =>
        `${r.fiscal_year}-${MONTH_LABELS[r.fiscal_month]}`,
    },
    {
      title: '일자', dataIndex: 'entry_date', key: 'date', width: 110,
    },
    {
      title: '적요', key: 'desc', ellipsis: true,
      render: (_: any, r: JournalListItem) =>
        r.description_kr || r.description_vn || '-',
    },
    {
      title: '차변 (VND)', dataIndex: 'total_debit', key: 'debit',
      width: 140, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: '대변 (VND)', dataIndex: 'total_credit', key: 'credit',
      width: 140, align: 'right' as const,
      render: fmtNum,
    },
    {
      title: '상태', dataIndex: 'status', key: 'status',
      width: 90, align: 'center' as const,
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] || { color: 'default', label: v };
        return <Tag color={cfg.color}>{cfg.label}</Tag>;
      },
    },
    {
      title: '소스', dataIndex: 'source', key: 'source',
      width: 110, align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'smartbooks_import' ? 'purple' : 'blue'}>
          {v === 'smartbooks_import' ? 'SmartBooks' : v}
        </Tag>
      ),
    },
  ];

  const lineColumns = [
    {
      title: '#', dataIndex: 'line_number', key: 'num',
      width: 40, align: 'center' as const,
    },
    {
      title: '계정', dataIndex: 'account_code', key: 'account',
      width: 90,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '적요', key: 'desc', ellipsis: true,
      render: (_: any, r: JournalLine) =>
        r.description_vn || r.description_en || '-',
    },
    {
      title: '차변', dataIndex: 'debit_amount', key: 'dr',
      width: 130, align: 'right' as const,
      render: (v: number) => v ? fmtNum(v) : '-',
    },
    {
      title: '대변', dataIndex: 'credit_amount', key: 'cr',
      width: 130, align: 'right' as const,
      render: (v: number) => v ? fmtNum(v) : '-',
    },
    {
      title: '거래처', key: 'party', width: 100,
      render: (_: any, r: JournalLine) =>
        r.vendor_id || r.customer_id || '-',
    },
  ];

  if (loading && items.length === 0) {
    return (
      <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <BookOutlined style={{ marginRight: 8 }} />
            분개전표
          </Title>
        </Col>
      </Row>

      {/* KPI 요약 */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic title="전체 전표" value={summary.total_entries} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="차변 합계"
                value={summary.total_debit}
                formatter={(v) => fmtNum(Number(v))}
                valueStyle={{ fontSize: 16 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="대변 합계"
                value={summary.total_credit}
                formatter={(v) => fmtNum(Number(v))}
                valueStyle={{ fontSize: 16 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="차대 균형"
                value={summary.total_debit === summary.total_credit ? '균형' : '불균형'}
                prefix={
                  summary.total_debit === summary.total_credit
                    ? <CheckCircleOutlined />
                    : <CloseCircleOutlined />
                }
                valueStyle={{
                  color: summary.total_debit === summary.total_credit
                    ? '#52c41a' : '#ff4d4f',
                  fontSize: 16,
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 필터 */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="전표번호/적요 검색"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="모듈"
          value={module}
          onChange={v => { setModule(v); setPage(1); }}
          allowClear
          style={{ width: 100 }}
          options={['GL', 'AP', 'AR', 'CA', 'OF'].map(m => ({
            value: m, label: m,
          }))}
        />
        <Select
          placeholder="상태"
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
          allowClear
          style={{ width: 110 }}
          options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({
            value: k, label: v.label,
          }))}
        />
        <Select
          placeholder="연도"
          value={year}
          onChange={v => { setYear(v); setPage(1); }}
          allowClear
          style={{ width: 100 }}
          options={[2024, 2025, 2026].map(y => ({
            value: y, label: String(y),
          }))}
        />
      </Space>

      {/* 목록 테이블 */}
      <Card size="small">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="entry_id"
          pagination={false}
          size="small"
          scroll={{ x: 1100 }}
          loading={loading}
        />
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={size}
            onChange={setPage}
            showTotal={t => `전체 ${t}건`}
            showSizeChanger={false}
          />
        </div>
      </Card>

      {/* 상세 모달 */}
      <Modal
        title={`분개전표: ${detail?.entry_number || ''}`}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={900}
      >
        {detail && (
          <>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="모듈">
                <Tag color={MODULE_COLOR[detail.module]}>{detail.module}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="상태">
                <Tag color={STATUS_CONFIG[detail.status]?.color}>
                  {STATUS_CONFIG[detail.status]?.label || detail.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="기간">
                {detail.fiscal_year}-{MONTH_LABELS[detail.fiscal_month]}
              </Descriptions.Item>
              <Descriptions.Item label="일자">
                {detail.entry_date}
              </Descriptions.Item>
              <Descriptions.Item label="통화">
                {detail.currency_code}
                {detail.exchange_rate && detail.exchange_rate !== 1
                  ? ` (Rate: ${detail.exchange_rate})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="소스">
                {detail.source}
                {detail.smartbooks_batch_nbr
                  ? ` (Batch: ${detail.smartbooks_batch_nbr})` : ''}
              </Descriptions.Item>
              <Descriptions.Item label="적요 (KR)" span={2}>
                {detail.description_kr || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="적요 (VN)" span={2}>
                {detail.description_vn || '-'}
              </Descriptions.Item>
              {detail.vendor_id && (
                <Descriptions.Item label="공급사">
                  {detail.vendor_id}
                </Descriptions.Item>
              )}
              {detail.customer_id && (
                <Descriptions.Item label="고객">
                  {detail.customer_id}
                </Descriptions.Item>
              )}
              {detail.invoice_no && (
                <Descriptions.Item label="인보이스">
                  {detail.invoice_no}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>분개 라인 ({detail.lines?.length || 0}건)</Text>
            </div>
            <Table
              columns={lineColumns}
              dataSource={detail.lines || []}
              rowKey="line_id"
              pagination={false}
              size="small"
              style={{ marginTop: 8 }}
              summary={(data) => {
                const totDr = data.reduce(
                  (s, r) => s + Number(r.debit_amount || 0), 0,
                );
                const totCr = data.reduce(
                  (s, r) => s + Number(r.credit_amount || 0), 0,
                );
                return (
                  <Table.Summary.Row style={{ fontWeight: 'bold' }}>
                    <Table.Summary.Cell index={0} />
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2} align="right">
                      합계
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">
                      {fmtNum(totDr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right">
                      {fmtNum(totCr)}
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5}>
                      {totDr === totCr
                        ? <Tag color="green">균형</Tag>
                        : <Tag color="red">불균형</Tag>}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                );
              }}
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default JournalEntriesPage;

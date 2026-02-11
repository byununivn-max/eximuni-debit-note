import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Card, Row, Col,
  Select, Input, DatePicker, Statistic, message, Popconfirm, Spin,
  Descriptions,
} from 'antd';
import {
  SyncOutlined, SearchOutlined, EyeOutlined,
  DollarOutlined, FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface SellingItem {
  item_id: number;
  selling_id: number;
  fee_name: string;
  fee_category?: string;
  amount: number;
  currency: string;
  mssql_source_column?: string;
}

interface SellingRecord {
  selling_id: number;
  record_type: string;
  mssql_source_id: number;
  mssql_cost_id?: number;
  customer_name?: string;
  invoice_no?: string;
  service_date?: string;
  total_selling_vnd: number;
  item_count: number;
  sync_status: string;
  synced_at: string;
  items?: SellingItem[];
}

interface SummaryItem {
  record_type: string;
  count: number;
  total_vnd: number;
}

interface Summary {
  items: SummaryItem[];
  grand_total_vnd: number;
  total_records: number;
}

const TYPE_LABELS: Record<string, string> = {
  clearance: 'CD 통관',
  ops: 'Ops 운영',
  co: 'CO 원산지',
};

const TYPE_COLORS: Record<string, string> = {
  clearance: 'blue',
  ops: 'green',
  co: 'purple',
};

const CATEGORY_LABELS: Record<string, string> = {
  customs: '통관',
  transport: '운송',
  handling: '하역/창고',
  co: 'CO',
  other: '기타',
};

const CATEGORY_COLORS: Record<string, string> = {
  customs: 'blue',
  transport: 'green',
  handling: 'orange',
  co: 'purple',
  other: 'default',
};

const SellingRecordsPage: React.FC = () => {
  const [records, setRecords] = useState<SellingRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<SellingRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (typeFilter) params.record_type = typeFilter;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }

      const [listRes, summaryRes] = await Promise.all([
        api.get('/api/v1/selling-records', { params }),
        api.get('/api/v1/selling-records/summary', {
          params: dateRange
            ? { date_from: dateRange[0], date_to: dateRange[1] }
            : {},
        }),
      ]);
      setRecords(listRes.data.items);
      setTotal(listRes.data.total);
      setSummary(summaryRes.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '매출 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, typeFilter, dateRange]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/api/v1/selling-records/sync');
      const d = res.data;
      message.success(
        `동기화 완료: 총 ${d.total_synced}건 ` +
        `(CD:${d.clearance_count}, OPS:${d.ops_count}, CO:${d.co_count})`
      );
      if (d.errors?.length > 0) {
        message.warning(`경고: ${d.errors.join(', ')}`);
      }
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '동기화 실패');
    } finally {
      setSyncing(false);
    }
  };

  const openDetail = async (record: SellingRecord) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await api.get(
        `/api/v1/selling-records/${record.selling_id}`
      );
      setDetailRecord(res.data);
    } catch (err: any) {
      message.error('상세 조회 실패');
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: '유형', dataIndex: 'record_type', key: 'type', width: 100,
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] || 'default'}>
          {TYPE_LABELS[v] || v}
        </Tag>
      ),
    },
    {
      title: '고객명', dataIndex: 'customer_name', key: 'customer',
      width: 200, ellipsis: true,
    },
    {
      title: '인보이스', dataIndex: 'invoice_no', key: 'invoice',
      width: 150, ellipsis: true,
    },
    {
      title: '서비스일', dataIndex: 'service_date', key: 'date', width: 110,
    },
    {
      title: '매출 합계 (VND)', dataIndex: 'total_selling_vnd', key: 'total',
      width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: '항목수', dataIndex: 'item_count', key: 'items',
      width: 80, align: 'center' as const,
    },
    {
      title: '동기화', dataIndex: 'synced_at', key: 'synced', width: 150,
      render: (v: string) => v?.replace('T', ' ').substring(0, 16),
    },
    {
      title: '', key: 'action', width: 70,
      render: (_: any, r: SellingRecord) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => openDetail(r)}
        >
          상세
        </Button>
      ),
    },
  ];

  const getSummaryByType = (type: string) =>
    summary?.items.find(i => i.record_type === type);

  return (
    <div>
      <Space
        style={{
          width: '100%', justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>매출 종합 조회</Title>
        <Popconfirm
          title="MSSQL 데이터를 동기화하시겠습니까?"
          description="기존 매출 데이터가 새로 갱신됩니다."
          onConfirm={handleSync}
          okText="동기화"
          cancelText="취소"
        >
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
          >
            MSSQL 동기화
          </Button>
        </Popconfirm>
      </Space>

      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title="전체 매출 (VND)"
                value={Number(summary.grand_total_vnd)}
                prefix={<DollarOutlined />}
                valueStyle={{ color: '#52c41a' }}
                formatter={(v) => Number(v).toLocaleString()}
              />
            </Card>
          </Col>
          {['clearance', 'ops', 'co'].map(type => {
            const s = getSummaryByType(type);
            return (
              <Col xs={24} sm={12} lg={6} key={type}>
                <Card size="small">
                  <Statistic
                    title={`${TYPE_LABELS[type]} (${s?.count || 0}건)`}
                    value={Number(s?.total_vnd || 0)}
                    prefix={<FileTextOutlined />}
                    formatter={(v) => Number(v).toLocaleString()}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="고객명/인보이스 검색"
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={(e) => {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }}
              onChange={(e) => {
                if (!e.target.value) { setSearch(''); setPage(1); }
              }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="유형"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[
                { value: 'clearance', label: 'CD 통관' },
                { value: 'ops', label: 'Ops 운영' },
                { value: 'co', label: 'CO 원산지' },
              ]}
            />
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([
                    dates[0].format('YYYY-MM-DD'),
                    dates[1].format('YYYY-MM-DD'),
                  ]);
                } else {
                  setDateRange(null);
                }
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={records}
          rowKey="selling_id"
          loading={loading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `총 ${t}건`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title="매출 상세"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailRecord(null); }}
        footer={null}
        width={800}
      >
        {detailLoading ? (
          <Spin style={{ display: 'block', margin: '40px auto' }} />
        ) : detailRecord ? (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="유형">
                <Tag color={TYPE_COLORS[detailRecord.record_type]}>
                  {TYPE_LABELS[detailRecord.record_type]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="고객명">
                {detailRecord.customer_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="인보이스">
                {detailRecord.invoice_no || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="서비스일">
                {detailRecord.service_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="매출 합계 (VND)">
                <Text strong style={{ color: '#52c41a' }}>
                  {Number(detailRecord.total_selling_vnd).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="동기화 시각">
                {detailRecord.synced_at?.replace('T', ' ').substring(0, 19)}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 16 }}>
              비용 항목 ({detailRecord.items?.length || 0}건)
            </Title>
            <Table
              dataSource={detailRecord.items}
              rowKey="item_id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: '비용 항목', dataIndex: 'fee_name',
                  key: 'name', width: 200,
                },
                {
                  title: '카테고리', dataIndex: 'fee_category',
                  key: 'cat', width: 100,
                  render: (v: string) => (
                    <Tag color={CATEGORY_COLORS[v] || 'default'}>
                      {CATEGORY_LABELS[v] || v}
                    </Tag>
                  ),
                },
                {
                  title: '금액 (VND)', dataIndex: 'amount',
                  key: 'amount', width: 150, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(),
                },
                {
                  title: '원본 컬럼', dataIndex: 'mssql_source_column',
                  key: 'col', width: 180,
                  render: (v: string) => (
                    <Text type="secondary" code>{v}</Text>
                  ),
                },
              ]}
              summary={(data) => {
                const sum = data.reduce(
                  (acc, row) => acc + Number(row.amount), 0
                );
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0}>
                      <Text strong>합계</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1} />
                    <Table.Summary.Cell index={2} align="right">
                      <Text strong>{sum.toLocaleString()}</Text>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} />
                  </Table.Summary.Row>
                );
              }}
            />
          </>
        ) : null}
      </Modal>
    </div>
  );
};

export default SellingRecordsPage;

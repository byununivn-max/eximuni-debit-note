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
import { useTranslation } from 'react-i18next';
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

const TYPE_LABEL_KEYS: Record<string, string> = {
  clearance: 'trading:selling.typeClearance',
  ops: 'trading:selling.typeOps',
  co: 'trading:selling.typeCo',
};

const TYPE_COLORS: Record<string, string> = {
  clearance: 'blue',
  ops: 'green',
  co: 'purple',
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  customs: 'trading:selling.categoryClearance',
  transport: 'trading:selling.categoryTransport',
  handling: 'trading:selling.categoryHandling',
  co: 'trading:selling.categoryCo',
  other: 'trading:selling.categoryOther',
};

const CATEGORY_COLORS: Record<string, string> = {
  customs: 'blue',
  transport: 'green',
  handling: 'orange',
  co: 'purple',
  other: 'default',
};

const SellingRecordsPage: React.FC = () => {
  const { t } = useTranslation(['trading', 'common']);
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
      message.error(err.response?.data?.detail || t('trading:selling.fetchFailed'));
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
        `${t('common:message.syncSuccess')}: ${t('common:pagination.totalItems', { count: d.total_synced })} ` +
        `(CD:${d.clearance_count}, OPS:${d.ops_count}, CO:${d.co_count})`
      );
      if (d.errors?.length > 0) {
        message.warning(`Warning: ${d.errors.join(', ')}`);
      }
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.syncFailed'));
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
      message.error(t('trading:selling.detailFetchFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: t('trading:selling.columnType'), dataIndex: 'record_type', key: 'type', width: 100,
      render: (v: string) => (
        <Tag color={TYPE_COLORS[v] || 'default'}>
          {TYPE_LABEL_KEYS[v] ? t(TYPE_LABEL_KEYS[v]) : v}
        </Tag>
      ),
    },
    {
      title: t('trading:selling.columnCustomer'), dataIndex: 'customer_name', key: 'customer',
      width: 200, ellipsis: true,
    },
    {
      title: t('trading:selling.columnInvoice'), dataIndex: 'invoice_no', key: 'invoice',
      width: 150, ellipsis: true,
    },
    {
      title: t('trading:selling.columnServiceDate'), dataIndex: 'service_date', key: 'date', width: 110,
    },
    {
      title: t('trading:selling.columnTotalVnd'), dataIndex: 'total_selling_vnd', key: 'total',
      width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    {
      title: t('trading:selling.columnItemCount'), dataIndex: 'item_count', key: 'items',
      width: 80, align: 'center' as const,
    },
    {
      title: t('trading:selling.columnSyncedAt'), dataIndex: 'synced_at', key: 'synced', width: 150,
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
          {t('common:button.detail')}
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
        <Title level={4} style={{ margin: 0 }}>{t('trading:selling.title')}</Title>
        <Popconfirm
          title={t('trading:selling.syncConfirm')}
          description={t('trading:selling.syncDescription')}
          onConfirm={handleSync}
          okText={t('common:button.sync')}
          cancelText={t('common:button.cancel')}
        >
          <Button
            type="primary"
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
          >
            {t('trading:selling.syncButton')}
          </Button>
        </Popconfirm>
      </Space>

      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card size="small">
              <Statistic
                title={t('trading:selling.totalSelling')}
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
                    title={`${TYPE_LABEL_KEYS[type] ? t(TYPE_LABEL_KEYS[type]) : type} (${s?.count || 0})`}
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
              placeholder={t('trading:selling.searchPlaceholder')}
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
              placeholder={t('trading:selling.typeFilter')}
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[
                { value: 'clearance', label: t('trading:selling.typeClearance') },
                { value: 'ops', label: t('trading:selling.typeOps') },
                { value: 'co', label: t('trading:selling.typeCo') },
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
            showTotal: (total) => t('common:pagination.totalItems', { count: total }),
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title={t('trading:selling.detailTitle')}
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
              <Descriptions.Item label={t('trading:selling.columnType')}>
                <Tag color={TYPE_COLORS[detailRecord.record_type]}>
                  {TYPE_LABEL_KEYS[detailRecord.record_type] ? t(TYPE_LABEL_KEYS[detailRecord.record_type]) : detailRecord.record_type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:selling.columnCustomer')}>
                {detailRecord.customer_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:selling.columnInvoice')}>
                {detailRecord.invoice_no || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:selling.columnServiceDate')}>
                {detailRecord.service_date || '-'}
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:selling.columnTotalVnd')}>
                <Text strong style={{ color: '#52c41a' }}>
                  {Number(detailRecord.total_selling_vnd).toLocaleString()}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label={t('trading:selling.columnSyncedAt')}>
                {detailRecord.synced_at?.replace('T', ' ').substring(0, 19)}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginTop: 16 }}>
              {t('trading:selling.costItems', { count: detailRecord.items?.length || 0 })}
            </Title>
            <Table
              dataSource={detailRecord.items}
              rowKey="item_id"
              size="small"
              pagination={false}
              columns={[
                {
                  title: t('trading:selling.costItemName'), dataIndex: 'fee_name',
                  key: 'name', width: 200,
                },
                {
                  title: t('trading:selling.costCategory'), dataIndex: 'fee_category',
                  key: 'cat', width: 100,
                  render: (v: string) => (
                    <Tag color={CATEGORY_COLORS[v] || 'default'}>
                      {CATEGORY_LABEL_KEYS[v] ? t(CATEGORY_LABEL_KEYS[v]) : v}
                    </Tag>
                  ),
                },
                {
                  title: t('trading:selling.costAmount'), dataIndex: 'amount',
                  key: 'amount', width: 150, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(),
                },
                {
                  title: t('trading:selling.costOriginalColumn'), dataIndex: 'mssql_source_column',
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
                      <Text strong>{t('common:table.total')}</Text>
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

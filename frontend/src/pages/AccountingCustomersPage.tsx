import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography, Button,
  Spin, Row, Col, Space, Pagination, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, SyncOutlined, LinkOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { AccountingCustomerItem } from '../types/accounting';

const { Title } = Typography;

const AccountingCustomersPage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AccountingCustomerItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mappedFilter, setMappedFilter] = useState<boolean | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size: 50 };
      if (search) params.search = search;
      if (mappedFilter !== undefined) params.is_mapped = mappedFilter;

      const res = await api.get('/api/v1/accounting-customers', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, search, mappedFilter]);

  const handleExtract = async () => {
    setExtracting(true);
    try {
      const res = await api.post('/api/v1/accounting-customers/extract-from-journal');
      message.success(
        t('common:message.importSuccess') + `: ${res.data.created}건 / ${res.data.skipped}건`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.importFailed'));
    } finally {
      setExtracting(false);
    }
  };

  const columns = [
    {
      title: t('accounting:customers.columnTaxId'), dataIndex: 'tax_id', key: 'tax',
      width: 130, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('accounting:customers.columnNameVn'), dataIndex: 'customer_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: t('accounting:customers.columnNameEn'), dataIndex: 'customer_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: t('accounting:customers.columnArAccount'), dataIndex: 'default_ar_account', key: 'ar',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('accounting:customers.columnRevenueAccount'), dataIndex: 'default_revenue_account', key: 'rev',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('accounting:customers.columnCurrency'), dataIndex: 'currency_code', key: 'ccy',
      width: 70, align: 'center' as const,
    },
    {
      title: t('accounting:customers.columnMssqlMapping'), dataIndex: 'mssql_client_ref', key: 'mapped',
      width: 110, align: 'center' as const,
      render: (v: number | null) => v
        ? <Tag color="green" icon={<LinkOutlined />}>#{v}</Tag>
        : <Tag color="default">{t('common:status.unmapped')}</Tag>,
    },
    {
      title: t('accounting:customers.columnSource'), dataIndex: 'source', key: 'source',
      width: 90, align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'smartbooks_import' ? 'purple' : 'blue'}>
          {v === 'smartbooks_import' ? 'SB' : 'manual'}
        </Tag>
      ),
    },
  ];

  if (loading && items.length === 0) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            {t('accounting:customers.titleCount', { count: total })}
          </Title>
        </Col>
        <Col>
          <Popconfirm title={t('accounting:customers.extractConfirm')} onConfirm={handleExtract}>
            <Button icon={<SyncOutlined spin={extracting} />} loading={extracting}>
              {t('accounting:customers.extractButton')}
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('accounting:customers.searchPlaceholder')}
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder={t('common:filter.mappingStatus')}
          value={mappedFilter}
          onChange={v => { setMappedFilter(v); setPage(1); }}
          allowClear
          style={{ width: 130 }}
          options={[
            { value: true, label: t('common:status.mapped') },
            { value: false, label: t('common:status.unmapped') },
          ]}
        />
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="customer_id"
          pagination={false}
          size="small"
          scroll={{ x: 850 }}
          loading={loading}
        />
        <div style={{ textAlign: 'right', marginTop: 16 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={50}
            onChange={setPage}
            showTotal={(total) => t('common:pagination.totalAll', { count: total })}
          />
        </div>
      </Card>
    </div>
  );
};

export default AccountingCustomersPage;

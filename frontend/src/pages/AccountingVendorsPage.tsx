import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography, Button,
  Spin, Row, Col, Space, Pagination, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, SyncOutlined, LinkOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { VendorItem } from '../types/accounting';

const { Title } = Typography;

const AccountingVendorsPage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VendorItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [mappedFilter, setMappedFilter] = useState<boolean | undefined>(undefined);
  const [extracting, setExtracting] = useState(false);
  const [matching, setMatching] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size: 50 };
      if (search) params.search = search;
      if (mappedFilter !== undefined) params.is_mapped = mappedFilter;

      const res = await api.get('/api/v1/accounting-vendors', { params });
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
      const res = await api.post('/api/v1/accounting-vendors/extract-from-journal');
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

  const handleMatch = async () => {
    setMatching(true);
    try {
      const res = await api.post('/api/v1/accounting-vendors/match-suppliers');
      message.success(
        t('common:message.syncSuccess') + `: ${res.data.matched}건 / ${res.data.unmatched}건`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.syncFailed'));
    } finally {
      setMatching(false);
    }
  };

  const columns = [
    {
      title: t('accounting:vendors.columnTaxId'), dataIndex: 'tax_id', key: 'tax',
      width: 130, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('accounting:vendors.columnNameVn'), dataIndex: 'vendor_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: t('accounting:vendors.columnNameEn'), dataIndex: 'vendor_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: t('accounting:vendors.columnApAccount'), dataIndex: 'default_ap_account', key: 'ap',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: t('accounting:vendors.columnCurrency'), dataIndex: 'currency_code', key: 'ccy',
      width: 70, align: 'center' as const,
    },
    {
      title: t('accounting:vendors.columnErpMapping'), dataIndex: 'mssql_supplier_ref', key: 'mapped',
      width: 100, align: 'center' as const,
      render: (v: number | null) => v
        ? <Tag color="green" icon={<LinkOutlined />}>#{v}</Tag>
        : <Tag color="default">{t('common:status.unmapped')}</Tag>,
    },
    {
      title: t('accounting:vendors.columnSource'), dataIndex: 'source', key: 'source',
      width: 100, align: 'center' as const,
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
            <ShopOutlined style={{ marginRight: 8 }} />
            {t('accounting:vendors.titleCount', { count: total })}
          </Title>
        </Col>
        <Col>
          <Space>
            <Popconfirm title={t('accounting:vendors.extractConfirm')} onConfirm={handleExtract}>
              <Button icon={<SyncOutlined spin={extracting} />} loading={extracting}>
                {t('accounting:vendors.extractButton')}
              </Button>
            </Popconfirm>
            <Popconfirm title={t('accounting:vendors.matchConfirm')} onConfirm={handleMatch}>
              <Button icon={<LinkOutlined />} loading={matching} type="primary">
                {t('accounting:vendors.matchButton')}
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder={t('accounting:vendors.searchPlaceholder')}
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
          rowKey="vendor_id"
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
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

export default AccountingVendorsPage;

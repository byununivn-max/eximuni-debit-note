import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography, Button,
  Spin, Row, Col, Space, Pagination, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, SyncOutlined, LinkOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface CustomerItem {
  customer_id: number;
  tax_id: string;
  customer_name_vn: string | null;
  customer_name_en: string | null;
  mssql_client_ref: number | null;
  default_ar_account: string;
  default_revenue_account: string;
  currency_code: string;
  source: string;
  is_active: boolean;
}

const AccountingCustomersPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<CustomerItem[]>([]);
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
        `추출 완료: ${res.data.created}건 생성, ${res.data.skipped}건 스킵`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '추출 실패');
    } finally {
      setExtracting(false);
    }
  };

  const columns = [
    {
      title: '사업자번호', dataIndex: 'tax_id', key: 'tax',
      width: 130, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '고객명 (VN)', dataIndex: 'customer_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: '고객명 (EN)', dataIndex: 'customer_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: 'AR 계정', dataIndex: 'default_ar_account', key: 'ar',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '매출 계정', dataIndex: 'default_revenue_account', key: 'rev',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '통화', dataIndex: 'currency_code', key: 'ccy',
      width: 70, align: 'center' as const,
    },
    {
      title: 'MSSQL 매핑', dataIndex: 'mssql_client_ref', key: 'mapped',
      width: 110, align: 'center' as const,
      render: (v: number | null) => v
        ? <Tag color="green" icon={<LinkOutlined />}>#{v}</Tag>
        : <Tag color="default">미매핑</Tag>,
    },
    {
      title: '소스', dataIndex: 'source', key: 'source',
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
            회계 고객 ({total}건)
          </Title>
        </Col>
        <Col>
          <Popconfirm title="분개장에서 Customer 추출?" onConfirm={handleExtract}>
            <Button icon={<SyncOutlined spin={extracting} />} loading={extracting}>
              분개장 추출
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          placeholder="사업자번호/이름 검색"
          prefix={<SearchOutlined />}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          allowClear
          style={{ width: 220 }}
        />
        <Select
          placeholder="매핑 상태"
          value={mappedFilter}
          onChange={v => { setMappedFilter(v); setPage(1); }}
          allowClear
          style={{ width: 130 }}
          options={[
            { value: true, label: '매핑됨' },
            { value: false, label: '미매핑' },
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
            showTotal={t => `전체 ${t}건`}
          />
        </div>
      </Card>
    </div>
  );
};

export default AccountingCustomersPage;

import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Typography, Button,
  Spin, Row, Col, Space, Pagination, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, SyncOutlined, LinkOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface VendorItem {
  vendor_id: number;
  tax_id: string;
  vendor_name_vn: string | null;
  vendor_name_en: string | null;
  mssql_supplier_ref: number | null;
  default_ap_account: string;
  currency_code: string;
  source: string;
  is_active: boolean;
}

const AccountingVendorsPage: React.FC = () => {
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
        `추출 완료: ${res.data.created}건 생성, ${res.data.skipped}건 스킵`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '추출 실패');
    } finally {
      setExtracting(false);
    }
  };

  const handleMatch = async () => {
    setMatching(true);
    try {
      const res = await api.post('/api/v1/accounting-vendors/match-suppliers');
      message.success(
        `매칭 완료: ${res.data.matched}건 매칭, ${res.data.unmatched}건 미매핑`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '매칭 실패');
    } finally {
      setMatching(false);
    }
  };

  const columns = [
    {
      title: '사업자번호', dataIndex: 'tax_id', key: 'tax',
      width: 130, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '공급사명 (VN)', dataIndex: 'vendor_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: '공급사명 (EN)', dataIndex: 'vendor_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: 'AP 계정', dataIndex: 'default_ap_account', key: 'ap',
      width: 100, align: 'center' as const,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '통화', dataIndex: 'currency_code', key: 'ccy',
      width: 70, align: 'center' as const,
    },
    {
      title: 'ERP 매핑', dataIndex: 'mssql_supplier_ref', key: 'mapped',
      width: 100, align: 'center' as const,
      render: (v: number | null) => v
        ? <Tag color="green" icon={<LinkOutlined />}>#{v}</Tag>
        : <Tag color="default">미매핑</Tag>,
    },
    {
      title: '소스', dataIndex: 'source', key: 'source',
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
            회계 공급사 ({total}건)
          </Title>
        </Col>
        <Col>
          <Space>
            <Popconfirm title="분개장에서 Vendor 추출?" onConfirm={handleExtract}>
              <Button icon={<SyncOutlined spin={extracting} />} loading={extracting}>
                분개장 추출
              </Button>
            </Popconfirm>
            <Popconfirm title="ERP 공급사와 자동 매칭?" onConfirm={handleMatch}>
              <Button icon={<LinkOutlined />} loading={matching} type="primary">
                공급사 매칭
              </Button>
            </Popconfirm>
          </Space>
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
            showTotal={t => `전체 ${t}건`}
          />
        </div>
      </Card>
    </div>
  );
};

export default AccountingVendorsPage;

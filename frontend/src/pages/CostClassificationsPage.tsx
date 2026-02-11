import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button,
  Spin, Row, Col, Space, Popconfirm, message, Statistic,
} from 'antd';
import {
  AppstoreOutlined, SyncOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface ClassificationItem {
  classification_id: number;
  account_code: string;
  cost_type: string;
  cost_category: string;
  allocation_method: string;
  cost_center_code: string | null;
  description_vn: string | null;
  description_en: string | null;
  is_active: boolean;
  effective_from: string | null;
  effective_to: string | null;
}

const TYPE_COLOR: Record<string, string> = {
  fixed: 'red',
  variable: 'green',
  semi_variable: 'orange',
};

const TYPE_LABEL: Record<string, string> = {
  fixed: '고정비',
  variable: '변동비',
  semi_variable: '반변동비',
};

const CATEGORY_LABEL: Record<string, string> = {
  salary: '급여',
  material: '재료비',
  depreciation: '감가상각',
  maintenance: '수선유지',
  tax: '세금/수수료',
  prepaid: '선급비용',
  outsourced: '외주',
  other: '기타',
};

const METHOD_LABEL: Record<string, string> = {
  daily_prorate: '일할안분',
  monthly_lump: '월 일괄',
  revenue_based: '매출비례',
};

const CostClassificationsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ClassificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (typeFilter) params.cost_type = typeFilter;
      const res = await api.get('/api/v1/cost-classifications', { params });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [typeFilter]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/api/v1/cost-classifications/seed');
      message.success(
        `시딩 완료: ${res.data.created}건 생성, ${res.data.skipped}건 스킵`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '시딩 실패');
    } finally {
      setSeeding(false);
    }
  };

  // 유형별 통계 계산
  const fixedCount = items.filter(i => i.cost_type === 'fixed').length;
  const variableCount = items.filter(i => i.cost_type === 'variable').length;
  const semiCount = items.filter(i => i.cost_type === 'semi_variable').length;

  const columns = [
    {
      title: '계정코드', dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '비용유형', dataIndex: 'cost_type', key: 'type',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: '분류', dataIndex: 'cost_category', key: 'cat',
      width: 100, align: 'center' as const,
      render: (v: string) => CATEGORY_LABEL[v] || v,
    },
    {
      title: '안분방법', dataIndex: 'allocation_method', key: 'method',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag>{METHOD_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: '설명 (VN)', dataIndex: 'description_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: '설명 (EN)', dataIndex: 'description_en', key: 'en',
      ellipsis: true,
    },
    {
      title: '비용센터', dataIndex: 'cost_center_code', key: 'cc',
      width: 100, align: 'center' as const,
      render: (v: string | null) => v || '전사',
    },
    {
      title: '상태', dataIndex: 'is_active', key: 'active',
      width: 70, align: 'center' as const,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag>
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
            <AppstoreOutlined style={{ marginRight: 8 }} />
            비용 분류 ({total}건)
          </Title>
        </Col>
        <Col>
          <Popconfirm title="642x 초기 비용 분류 시딩?" onConfirm={handleSeed}>
            <Button
              icon={<DatabaseOutlined />}
              loading={seeding}
            >
              642x 시딩
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="전체" value={total} suffix="건" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="고정비"
              value={fixedCount}
              suffix="건"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="변동비"
              value={variableCount}
              suffix="건"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="반변동비"
              value={semiCount}
              suffix="건"
              valueStyle={{ color: '#d46b08' }}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="비용유형 필터"
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: 'fixed', label: '고정비' },
            { value: 'variable', label: '변동비' },
            { value: 'semi_variable', label: '반변동비' },
          ]}
        />
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={items}
          rowKey="classification_id"
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          loading={loading}
        />
      </Card>
    </div>
  );
};

export default CostClassificationsPage;

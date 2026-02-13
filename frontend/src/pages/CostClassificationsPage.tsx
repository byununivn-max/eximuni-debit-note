import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button,
  Spin, Row, Col, Space, Popconfirm, message, Statistic,
} from 'antd';
import {
  AppstoreOutlined, SyncOutlined, DatabaseOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { ClassificationItem } from '../types/cost';

const { Title } = Typography;

const TYPE_COLOR: Record<string, string> = {
  fixed: 'red',
  variable: 'green',
  semi_variable: 'orange',
};

const CostClassificationsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);

  const TYPE_LABEL: Record<string, string> = {
    fixed: t('common:costType.fixed'),
    variable: t('common:costType.variable'),
    semi_variable: t('common:costType.semi_variable'),
  };

  const CATEGORY_LABEL: Record<string, string> = {
    salary: t('analytics:costClassification.categorySalary'),
    material: t('analytics:costClassification.categoryMaterial'),
    depreciation: t('analytics:costClassification.categoryDepreciation'),
    maintenance: t('analytics:costClassification.categoryMaintenance'),
    tax: t('analytics:costClassification.categoryTax'),
    prepaid: t('analytics:costClassification.categoryPrepaid'),
    outsourced: t('analytics:costClassification.categoryOutsourced'),
    other: t('analytics:costClassification.categoryOther'),
  };

  const METHOD_LABEL: Record<string, string> = {
    daily_prorate: t('analytics:costClassification.methodDailyProrate'),
    monthly_lump: t('analytics:costClassification.methodMonthlyLump'),
    revenue_based: t('analytics:costClassification.methodRevenueBased'),
  };

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
      message.success(t('common:message.success'));
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
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
      title: t('analytics:costClassification.columnAccountCode'), dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('analytics:costClassification.columnCostType'), dataIndex: 'cost_type', key: 'type',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: t('analytics:costClassification.columnCategory'), dataIndex: 'cost_category', key: 'cat',
      width: 100, align: 'center' as const,
      render: (v: string) => CATEGORY_LABEL[v] || v,
    },
    {
      title: t('analytics:costClassification.columnAllocationMethod'), dataIndex: 'allocation_method', key: 'method',
      width: 100, align: 'center' as const,
      render: (v: string) => (
        <Tag>{METHOD_LABEL[v] || v}</Tag>
      ),
    },
    {
      title: t('analytics:costClassification.columnDescVn'), dataIndex: 'description_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: t('analytics:costClassification.columnDescEn'), dataIndex: 'description_en', key: 'en',
      ellipsis: true,
    },
    {
      title: t('analytics:costClassification.columnCostCenter'), dataIndex: 'cost_center_code', key: 'cc',
      width: 100, align: 'center' as const,
      render: (v: string | null) => v || t('analytics:costClassification.companyWide'),
    },
    {
      title: t('analytics:costClassification.columnStatus'), dataIndex: 'is_active', key: 'active',
      width: 70, align: 'center' as const,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? t('common:status.active') : t('common:status.inactive')}</Tag>
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
            {t('analytics:costClassification.titleCount', { count: total })}
          </Title>
        </Col>
        <Col>
          <Popconfirm title={t('analytics:costClassification.seedConfirm')} onConfirm={handleSeed}>
            <Button
              icon={<DatabaseOutlined />}
              loading={seeding}
            >
              {t('analytics:costClassification.seedButton')}
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title={t('analytics:costClassification.total')} value={total} suffix="건" />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('common:costType.fixed')}
              value={fixedCount}
              suffix="건"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('common:costType.variable')}
              value={variableCount}
              suffix="건"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title={t('common:costType.semi_variable')}
              value={semiCount}
              suffix="건"
              valueStyle={{ color: '#d46b08' }}
            />
          </Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder={t('analytics:costClassification.typeFilter')}
          value={typeFilter}
          onChange={setTypeFilter}
          allowClear
          style={{ width: 150 }}
          options={[
            { value: 'fixed', label: t('common:costType.fixed') },
            { value: 'variable', label: t('common:costType.variable') },
            { value: 'semi_variable', label: t('common:costType.semi_variable') },
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

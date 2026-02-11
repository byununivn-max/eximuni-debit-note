import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Input, Select, Space, Typography, Button,
  Spin, Row, Col, Statistic, Tree, Tabs, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, SyncOutlined, BankOutlined,
  AccountBookOutlined,
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import api from '../services/api';

const { Title } = Typography;

interface CoAItem {
  account_id: number;
  account_code: string;
  account_name_vn: string;
  account_name_en: string;
  account_name_kr: string;
  account_type: string;
  account_group: string;
  normal_balance: string;
  is_active: boolean;
  smartbooks_mapped: boolean;
}

interface CoATreeNode {
  account_id: number;
  account_code: string;
  account_name_vn: string;
  account_name_en: string;
  account_name_kr: string;
  account_type: string;
  account_group: string;
  normal_balance: string;
  is_active: boolean;
  smartbooks_mapped: boolean;
  children: CoATreeNode[];
}

interface CostCenterItem {
  center_id: number;
  center_code: string;
  center_name_vn: string;
  center_name_en: string;
  center_name_kr: string;
  center_type: string;
  is_active: boolean;
}

interface Summary {
  by_type: Record<string, number>;
  total: number;
}

const TYPE_COLOR: Record<string, string> = {
  asset: 'blue',
  liability: 'red',
  equity: 'purple',
  revenue: 'green',
  expense: 'orange',
};

const TYPE_LABEL: Record<string, string> = {
  asset: '자산',
  liability: '부채',
  equity: '자본',
  revenue: '수익',
  expense: '비용',
};

const ChartOfAccountsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<CoAItem[]>([]);
  const [treeData, setTreeData] = useState<CoATreeNode[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.account_type = typeFilter;
      if (search) params.search = search;

      const [listRes, treeRes, ccRes, sumRes] = await Promise.all([
        api.get('/api/v1/chart-of-accounts', { params }),
        api.get('/api/v1/chart-of-accounts/tree'),
        api.get('/api/v1/chart-of-accounts/cost-centers/list'),
        api.get('/api/v1/chart-of-accounts/summary'),
      ]);
      setAccounts(listRes.data);
      setTreeData(treeRes.data);
      setCostCenters(ccRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [typeFilter, search]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await api.post('/api/v1/chart-of-accounts/seed');
      const coa = res.data.chart_of_accounts;
      const cc = res.data.cost_centers;
      message.success(
        `시딩 완료: 계정 ${coa.created}건 생성, ${coa.skipped}건 스킵 / ` +
        `비용센터 ${cc.created}건 생성, ${cc.skipped}건 스킵`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '시딩 실패');
    } finally {
      setSeeding(false);
    }
  };

  /** 트리 데이터 → Ant Design Tree DataNode 변환 */
  const convertToTreeData = (nodes: CoATreeNode[]): DataNode[] =>
    nodes.map(n => ({
      key: n.account_code,
      title: (
        <span>
          <Tag color={TYPE_COLOR[n.account_type]} style={{ marginRight: 4 }}>
            {n.account_code}
          </Tag>
          {n.account_name_kr}
          <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
            {n.account_name_en}
          </span>
        </span>
      ),
      children: n.children?.length ? convertToTreeData(n.children) : undefined,
    }));

  const columns = [
    {
      title: '코드', dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: '한국어', dataIndex: 'account_name_kr', key: 'kr',
      ellipsis: true,
    },
    {
      title: 'English', dataIndex: 'account_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: 'Tiếng Việt', dataIndex: 'account_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: '유형', dataIndex: 'account_type', key: 'type',
      width: 80, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{TYPE_LABEL[v]}</Tag>
      ),
    },
    {
      title: '잔액방향', dataIndex: 'normal_balance', key: 'balance',
      width: 90, align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'debit' ? 'blue' : 'red'}>
          {v === 'debit' ? '차변' : '대변'}
        </Tag>
      ),
    },
    {
      title: 'SmartBooks', dataIndex: 'smartbooks_mapped', key: 'sb',
      width: 100, align: 'center' as const,
      render: (v: boolean) => v ? <Tag color="green">매핑됨</Tag> : '-',
    },
  ];

  const ccColumns = [
    {
      title: '코드', dataIndex: 'center_code', key: 'code', width: 120,
      render: (v: string) => <strong>{v}</strong>,
    },
    { title: '한국어', dataIndex: 'center_name_kr', key: 'kr' },
    { title: 'English', dataIndex: 'center_name_en', key: 'en' },
    { title: 'Tiếng Việt', dataIndex: 'center_name_vn', key: 'vn' },
    {
      title: '유형', dataIndex: 'center_type', key: 'type', width: 100,
      align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'logistic' ? 'blue' : v === 'general' ? 'green' : 'default'}>
          {v.toUpperCase()}
        </Tag>
      ),
    },
  ];

  if (loading && accounts.length === 0) {
    return (
      <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <AccountBookOutlined style={{ marginRight: 8 }} />
            계정과목 관리
          </Title>
        </Col>
        <Col>
          <Popconfirm
            title="SmartBooks 54개 계정 + 비용센터를 시딩하시겠습니까?"
            onConfirm={handleSeed}
            okText="실행"
            cancelText="취소"
          >
            <Button
              icon={<SyncOutlined spin={seeding} />}
              loading={seeding}
            >
              SmartBooks 시딩
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      {/* KPI 요약 카드 */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic title="전체 계정" value={summary.total} />
            </Card>
          </Col>
          {Object.entries(TYPE_LABEL).map(([key, label]) => (
            <Col xs={12} sm={8} lg={4} key={key}>
              <Card size="small">
                <Statistic
                  title={label}
                  value={summary.by_type[key] || 0}
                  valueStyle={{ color: TYPE_COLOR[key] === 'blue' ? '#1890ff' : undefined }}
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Tabs
        defaultActiveKey="table"
        items={[
          {
            key: 'table',
            label: '테이블 보기',
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Input
                    placeholder="코드 또는 이름 검색"
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                    style={{ width: 250 }}
                  />
                  <Select
                    placeholder="유형 필터"
                    value={typeFilter}
                    onChange={setTypeFilter}
                    allowClear
                    style={{ width: 130 }}
                    options={Object.entries(TYPE_LABEL).map(([k, v]) => ({
                      value: k, label: v,
                    }))}
                  />
                </Space>
                <Table
                  columns={columns}
                  dataSource={accounts}
                  rowKey="account_id"
                  pagination={false}
                  size="small"
                  scroll={{ x: 900 }}
                  loading={loading}
                />
              </>
            ),
          },
          {
            key: 'tree',
            label: '트리 보기',
            children: (
              <Card size="small">
                {treeData.length > 0 ? (
                  <Tree
                    showLine
                    defaultExpandAll
                    treeData={convertToTreeData(treeData)}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                    계정과목이 없습니다. SmartBooks 시딩을 실행하세요.
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'cost-centers',
            label: '비용센터',
            children: (
              <Table
                columns={ccColumns}
                dataSource={costCenters}
                rowKey="center_id"
                pagination={false}
                size="small"
              />
            ),
          },
        ]}
      />
    </div>
  );
};

export default ChartOfAccountsPage;

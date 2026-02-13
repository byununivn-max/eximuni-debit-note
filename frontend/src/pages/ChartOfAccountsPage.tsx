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
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type {
  CoAItem, CoATreeNode, CostCenterItem, CoASummary,
} from '../types/accounting';

const { Title } = Typography;

const TYPE_COLOR: Record<string, string> = {
  asset: 'blue',
  liability: 'red',
  equity: 'purple',
  revenue: 'green',
  expense: 'orange',
};

const TYPE_KEYS = ['asset', 'liability', 'equity', 'revenue', 'expense'];

const ChartOfAccountsPage: React.FC = () => {
  const { t } = useTranslation(['accounting', 'common']);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<CoAItem[]>([]);
  const [treeData, setTreeData] = useState<CoATreeNode[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenterItem[]>([]);
  const [summary, setSummary] = useState<CoASummary | null>(null);
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
        t('accounting:coa.seedSuccess', {
          coaCreated: coa.created,
          coaSkipped: coa.skipped,
          ccCreated: cc.created,
          ccSkipped: cc.skipped,
          defaultValue:
            `시딩 완료: 계정 ${coa.created}건 생성, ${coa.skipped}건 스킵 / ` +
            `비용센터 ${cc.created}건 생성, ${cc.skipped}건 스킵`,
        }),
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
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
      title: t('accounting:coa.columnCode'), dataIndex: 'account_code', key: 'code',
      width: 100, fixed: 'left' as const,
      render: (v: string) => <strong>{v}</strong>,
    },
    {
      title: t('accounting:coa.columnKorean'), dataIndex: 'account_name_kr', key: 'kr',
      ellipsis: true,
    },
    {
      title: t('accounting:coa.columnEnglish'), dataIndex: 'account_name_en', key: 'en',
      ellipsis: true,
    },
    {
      title: t('accounting:coa.columnVietnamese'), dataIndex: 'account_name_vn', key: 'vn',
      ellipsis: true,
    },
    {
      title: t('accounting:coa.columnType'), dataIndex: 'account_type', key: 'type',
      width: 80, align: 'center' as const,
      render: (v: string) => (
        <Tag color={TYPE_COLOR[v]}>{t(`common:accountType.${v}`)}</Tag>
      ),
    },
    {
      title: t('accounting:coa.columnBalance'), dataIndex: 'normal_balance', key: 'balance',
      width: 90, align: 'center' as const,
      render: (v: string) => (
        <Tag color={v === 'debit' ? 'blue' : 'red'}>
          {t(`common:balanceDirection.${v}`)}
        </Tag>
      ),
    },
    {
      title: t('accounting:coa.columnSmartbooks'), dataIndex: 'smartbooks_mapped', key: 'sb',
      width: 100, align: 'center' as const,
      render: (v: boolean) => v ? <Tag color="green">{t('common:status.mapped')}</Tag> : '-',
    },
  ];

  const ccColumns = [
    {
      title: t('accounting:coa.columnCode'), dataIndex: 'center_code', key: 'code', width: 120,
      render: (v: string) => <strong>{v}</strong>,
    },
    { title: t('accounting:coa.columnKorean'), dataIndex: 'center_name_kr', key: 'kr' },
    { title: t('accounting:coa.columnEnglish'), dataIndex: 'center_name_en', key: 'en' },
    { title: t('accounting:coa.columnVietnamese'), dataIndex: 'center_name_vn', key: 'vn' },
    {
      title: t('accounting:coa.columnType'), dataIndex: 'center_type', key: 'type', width: 100,
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
            {t('accounting:coa.title')}
          </Title>
        </Col>
        <Col>
          <Popconfirm
            title={t('accounting:coa.seedConfirm')}
            onConfirm={handleSeed}
            okText={t('common:button.confirm')}
            cancelText={t('common:button.cancel')}
          >
            <Button
              icon={<SyncOutlined spin={seeding} />}
              loading={seeding}
            >
              {t('accounting:coa.seedButton')}
            </Button>
          </Popconfirm>
        </Col>
      </Row>

      {/* KPI 요약 카드 */}
      {summary && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} lg={4}>
            <Card size="small">
              <Statistic title={t('accounting:coa.totalAccounts')} value={summary.total} />
            </Card>
          </Col>
          {TYPE_KEYS.map((key) => (
            <Col xs={12} sm={8} lg={4} key={key}>
              <Card size="small">
                <Statistic
                  title={t(`common:accountType.${key}`)}
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
            label: t('accounting:coa.tableView'),
            children: (
              <>
                <Space style={{ marginBottom: 16 }}>
                  <Input
                    placeholder={t('accounting:coa.searchPlaceholder')}
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    allowClear
                    style={{ width: 250 }}
                  />
                  <Select
                    placeholder={t('accounting:coa.typeFilter')}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    allowClear
                    style={{ width: 130 }}
                    options={TYPE_KEYS.map((k) => ({
                      value: k, label: t(`common:accountType.${k}`),
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
            label: t('accounting:coa.treeView'),
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
                    {t('accounting:coa.noAccounts')}
                  </div>
                )}
              </Card>
            ),
          },
          {
            key: 'cost-centers',
            label: t('accounting:coa.costCenters'),
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

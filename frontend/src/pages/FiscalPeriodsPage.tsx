import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button, Spin,
  Row, Col, Space, Popconfirm, message,
} from 'antd';
import {
  CalendarOutlined, LockOutlined, UnlockOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { FiscalPeriodItem } from '../types/accounting';

const { Title } = Typography;

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const FiscalPeriodsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<FiscalPeriodItem[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [generating, setGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/fiscal-periods', {
        params: { year },
      });
      setPeriods(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [year]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post(
        `/api/v1/fiscal-periods/generate?year=${year}`,
      );
      message.success(
        `${year}: ${res.data.created} created, ${res.data.skipped} skipped`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.createFailed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = async (periodId: number) => {
    try {
      await api.post(`/api/v1/fiscal-periods/${periodId}/close`);
      message.success(t('analytics:masterData.fiscalPeriods.closeSuccess'));
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
    }
  };

  const handleReopen = async (periodId: number) => {
    try {
      await api.post(`/api/v1/fiscal-periods/${periodId}/reopen`);
      message.success(t('analytics:masterData.fiscalPeriods.reopenSuccess'));
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
    }
  };

  const closedCount = periods.filter(p => p.is_closed).length;
  const openCount = periods.filter(p => !p.is_closed).length;

  const columns = [
    {
      title: t('analytics:masterData.fiscalPeriods.columnMonth'), dataIndex: 'period_month', key: 'month',
      width: 80, align: 'center' as const,
      render: (v: number) => <strong>{MONTH_LABELS[v]}</strong>,
    },
    {
      title: t('analytics:masterData.fiscalPeriods.columnStart'), dataIndex: 'start_date', key: 'start',
      width: 120, align: 'center' as const,
    },
    {
      title: t('analytics:masterData.fiscalPeriods.columnEnd'), dataIndex: 'end_date', key: 'end',
      width: 120, align: 'center' as const,
    },
    {
      title: t('analytics:masterData.fiscalPeriods.columnStatus'), dataIndex: 'is_closed', key: 'status',
      width: 100, align: 'center' as const,
      render: (v: boolean) => v
        ? <Tag icon={<LockOutlined />} color="red">{t('common:status.closed')}</Tag>
        : <Tag icon={<UnlockOutlined />} color="green">{t('common:status.open')}</Tag>,
    },
    {
      title: t('analytics:masterData.fiscalPeriods.columnClosedAt'), dataIndex: 'closed_at', key: 'closed_at',
      width: 180,
      render: (v: string | null) => v
        ? new Date(v).toLocaleString('ko-KR')
        : '-',
    },
    {
      title: t('analytics:masterData.fiscalPeriods.columnAction'), key: 'action', width: 120,
      align: 'center' as const,
      render: (_: any, r: FiscalPeriodItem) => r.is_closed ? (
        <Popconfirm
          title={t('analytics:masterData.fiscalPeriods.reopenConfirm')}
          onConfirm={() => handleReopen(r.period_id)}
          okText={t('common:button.reopen')}
          cancelText={t('common:button.cancel')}
        >
          <Button size="small" icon={<UnlockOutlined />}>
            {t('common:button.reopen')}
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm
          title={t('analytics:masterData.fiscalPeriods.closeConfirm')}
          onConfirm={() => handleClose(r.period_id)}
          okText={t('common:button.close')}
          cancelText={t('common:button.cancel')}
        >
          <Button size="small" type="primary" icon={<LockOutlined />}>
            {t('common:button.close')}
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (loading && periods.length === 0) {
    return (
      <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />
    );
  }

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            {t('analytics:masterData.fiscalPeriods.title')}
          </Title>
        </Col>
        <Col>
          <Space>
            <Select
              value={year}
              onChange={setYear}
              style={{ width: 100 }}
              options={[
                { value: 2024, label: '2024' },
                { value: 2025, label: '2025' },
                { value: 2026, label: '2026' },
              ]}
            />
            <Popconfirm
              title={t('analytics:masterData.fiscalPeriods.generateConfirm', { year })}
              onConfirm={handleGenerate}
              okText={t('common:button.generate')}
              cancelText={t('common:button.cancel')}
            >
              <Button
                icon={<PlusOutlined />}
                loading={generating}
              >
                {t('analytics:masterData.fiscalPeriods.generateButton')}
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      {/* 요약 카드 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small">
            <Space>
              <CalendarOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <div style={{ color: '#999', fontSize: 12 }}>{t('analytics:masterData.fiscalPeriods.totalPeriods')}</div>
                <strong style={{ fontSize: 20 }}>{periods.length}</strong>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Space>
              <UnlockOutlined style={{ fontSize: 24, color: '#52c41a' }} />
              <div>
                <div style={{ color: '#999', fontSize: 12 }}>{t('common:status.open')}</div>
                <strong style={{ fontSize: 20, color: '#52c41a' }}>
                  {openCount}
                </strong>
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Space>
              <LockOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
              <div>
                <div style={{ color: '#999', fontSize: 12 }}>{t('common:status.closed')}</div>
                <strong style={{ fontSize: 20, color: '#ff4d4f' }}>
                  {closedCount}
                </strong>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title={t('analytics:masterData.fiscalPeriods.cardTitle', { year, count: periods.length })}
        size="small"
      >
        {periods.length > 0 ? (
          <Table
            columns={columns}
            dataSource={periods}
            rowKey="period_id"
            pagination={false}
            size="small"
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            {t('analytics:masterData.fiscalPeriods.noPeriods', { year })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FiscalPeriodsPage;

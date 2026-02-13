import React, { useEffect, useState } from 'react';
import {
  Table, Typography, Tag, Card, Row, Col, Select, Input, DatePicker,
  Tabs, message, Space, Descriptions, Modal, Timeline,
} from 'antd';
import {
  SearchOutlined, HistoryOutlined, AuditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { WorkflowItem, AuditLogItem } from '../types/accounting';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const ENTITY_LABELS: Record<string, string> = {
  debit_note: 'Debit Note',
  purchase_order: 'purchase_order',
  selling_record: 'selling_record',
  erp_suppliers: 'erp_suppliers',
  erp_purchase_orders: 'erp_purchase_orders',
  erp_selling_records: 'erp_selling_records',
};

const ACTION_COLORS: Record<string, string> = {
  submit: 'processing',
  approve: 'success',
  reject: 'error',
  confirm: 'success',
  cancel: 'warning',
  INSERT: 'green',
  UPDATE: 'blue',
  DELETE: 'red',
};

const AuditLogsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [activeTab, setActiveTab] = useState('workflow');

  // 워크플로우 상태
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [wfTotal, setWfTotal] = useState(0);
  const [wfLoading, setWfLoading] = useState(true);
  const [wfPage, setWfPage] = useState(1);
  const [wfPageSize, setWfPageSize] = useState(20);
  const [wfEntityType, setWfEntityType] = useState<string | undefined>();
  const [wfAction, setWfAction] = useState<string | undefined>();
  const [wfDateRange, setWfDateRange] = useState<[string, string] | null>(null);

  // 감사 로그 상태
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [auditEntityType, setAuditEntityType] = useState<string | undefined>();
  const [auditAction, setAuditAction] = useState<string | undefined>();
  const [auditDateRange, setAuditDateRange] = useState<[string, string] | null>(null);

  // 상세 모달
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLog, setDetailLog] = useState<AuditLogItem | null>(null);

  const fetchWorkflows = async () => {
    setWfLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (wfPage - 1) * wfPageSize,
        limit: wfPageSize,
      };
      if (wfEntityType) params.entity_type = wfEntityType;
      if (wfAction) params.action = wfAction;
      if (wfDateRange) {
        params.date_from = wfDateRange[0];
        params.date_to = wfDateRange[1];
      }
      const res = await api.get('/api/v1/workflows', { params });
      setWorkflows(res.data.items);
      setWfTotal(res.data.total);
    } catch (err: any) {
      message.error(t('common:message.fetchFailed'));
    } finally {
      setWfLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (auditPage - 1) * auditPageSize,
        limit: auditPageSize,
      };
      if (auditEntityType) params.entity_type = auditEntityType;
      if (auditAction) params.action = auditAction;
      if (auditDateRange) {
        params.date_from = auditDateRange[0];
        params.date_to = auditDateRange[1];
      }
      const res = await api.get('/api/v1/erp-audit-logs', { params });
      setAuditLogs(res.data.items);
      setAuditTotal(res.data.total);
    } catch (err: any) {
      message.error(t('common:message.fetchFailed'));
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'workflow') fetchWorkflows();
  }, [activeTab, wfPage, wfPageSize, wfEntityType, wfAction, wfDateRange]);

  useEffect(() => {
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, auditPage, auditPageSize, auditEntityType, auditAction, auditDateRange]);

  const wfColumns = [
    {
      title: t('analytics:audit.wfColumnTime'), dataIndex: 'created_at', key: 'time', width: 160,
      render: (v: string) => v?.replace('T', ' ').substring(0, 19),
    },
    {
      title: t('analytics:audit.wfColumnTarget'), dataIndex: 'entity_type', key: 'entity', width: 120,
      render: (v: string) => (
        <Tag>{ENTITY_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: t('analytics:audit.wfColumnId'), dataIndex: 'entity_id', key: 'id', width: 70,
      align: 'center' as const,
    },
    {
      title: t('analytics:audit.wfColumnAction'), dataIndex: 'action', key: 'action', width: 100,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] || 'default'}>{v.toUpperCase()}</Tag>
      ),
    },
    {
      title: t('analytics:audit.wfColumnFromStatus'), dataIndex: 'from_status', key: 'from', width: 120,
      render: (v: string) => v || '-',
    },
    {
      title: t('analytics:audit.wfColumnToStatus'), dataIndex: 'to_status', key: 'to', width: 120,
      render: (v: string) => v ? (
        <Tag color="blue">{v}</Tag>
      ) : '-',
    },
    {
      title: t('analytics:audit.wfColumnUser'), dataIndex: 'performed_by', key: 'user', width: 80,
      align: 'center' as const,
    },
    {
      title: t('analytics:audit.wfColumnComment'), dataIndex: 'comment', key: 'comment',
      ellipsis: true,
    },
  ];

  const auditColumns = [
    {
      title: t('analytics:audit.auditColumnTime'), dataIndex: 'action_at', key: 'time', width: 160,
      render: (v: string) => v?.replace('T', ' ').substring(0, 19),
    },
    {
      title: t('analytics:audit.auditColumnTable'), dataIndex: 'entity_type', key: 'entity', width: 180,
      render: (v: string) => (
        <Text code>{ENTITY_LABELS[v] || v}</Text>
      ),
    },
    {
      title: t('analytics:audit.auditColumnId'), dataIndex: 'entity_id', key: 'id', width: 70,
      align: 'center' as const,
    },
    {
      title: t('analytics:audit.auditColumnAction'), dataIndex: 'action', key: 'action', width: 100,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] || 'default'}>{v}</Tag>
      ),
    },
    {
      title: t('analytics:audit.auditColumnUser'), dataIndex: 'performed_by', key: 'user', width: 80,
      align: 'center' as const,
    },
    {
      title: t('analytics:audit.auditColumnIp'), dataIndex: 'ip_address', key: 'ip', width: 130,
    },
    {
      title: '', key: 'detail', width: 70,
      render: (_: any, r: AuditLogItem) => (
        (r.old_values || r.new_values) ? (
          <a onClick={() => { setDetailLog(r); setDetailOpen(true); }}>
            {t('common:button.detail')}
          </a>
        ) : null
      ),
    },
  ];

  const renderDateRangePicker = (
    onChange: (range: [string, string] | null) => void,
    setPage: (p: number) => void,
  ) => (
    <RangePicker
      style={{ width: '100%' }}
      onChange={(dates) => {
        if (dates && dates[0] && dates[1]) {
          onChange([
            dates[0].format('YYYY-MM-DD'),
            dates[1].format('YYYY-MM-DD'),
          ]);
        } else {
          onChange(null);
        }
        setPage(1);
      }}
    />
  );

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('analytics:audit.title')}</Title>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'workflow',
            label: (
              <span><HistoryOutlined /> {t('analytics:audit.workflowTab')}</span>
            ),
            children: (
              <>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={5}>
                      <Select
                        placeholder={t('analytics:audit.targetType')}
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(v) => { setWfEntityType(v); setWfPage(1); }}
                        options={[
                          { value: 'debit_note', label: 'Debit Note' },
                          { value: 'purchase_order', label: ENTITY_LABELS['purchase_order'] },
                          { value: 'selling_record', label: ENTITY_LABELS['selling_record'] },
                        ]}
                      />
                    </Col>
                    <Col span={5}>
                      <Select
                        placeholder={t('analytics:audit.actionFilter')}
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(v) => { setWfAction(v); setWfPage(1); }}
                        options={[
                          { value: 'submit', label: t('analytics:audit.actionSubmit') },
                          { value: 'approve', label: t('analytics:audit.actionApprove') },
                          { value: 'reject', label: t('analytics:audit.actionReject') },
                          { value: 'confirm', label: t('analytics:audit.actionConfirm') },
                          { value: 'cancel', label: t('analytics:audit.actionCancel') },
                        ]}
                      />
                    </Col>
                    <Col span={6}>
                      {renderDateRangePicker(setWfDateRange, setWfPage)}
                    </Col>
                  </Row>
                </Card>
                <Card size="small">
                  <Table
                    columns={wfColumns}
                    dataSource={workflows}
                    rowKey="workflow_id"
                    loading={wfLoading}
                    size="small"
                    scroll={{ x: 1000 }}
                    pagination={{
                      current: wfPage,
                      pageSize: wfPageSize,
                      total: wfTotal,
                      showSizeChanger: true,
                      showTotal: (total) => t('common:pagination.totalItems', { count: total }),
                      onChange: (p, ps) => {
                        setWfPage(p);
                        setWfPageSize(ps);
                      },
                    }}
                  />
                </Card>
              </>
            ),
          },
          {
            key: 'audit',
            label: (
              <span><AuditOutlined /> {t('analytics:audit.auditTab')}</span>
            ),
            children: (
              <>
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Select
                        placeholder={t('analytics:audit.tableFilter')}
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(v) => {
                          setAuditEntityType(v);
                          setAuditPage(1);
                        }}
                        options={[
                          { value: 'erp_suppliers', label: ENTITY_LABELS['erp_suppliers'] },
                          { value: 'erp_purchase_orders', label: ENTITY_LABELS['erp_purchase_orders'] },
                          { value: 'erp_selling_records', label: ENTITY_LABELS['erp_selling_records'] },
                        ]}
                      />
                    </Col>
                    <Col span={4}>
                      <Select
                        placeholder={t('analytics:audit.actionFilter')}
                        allowClear
                        style={{ width: '100%' }}
                        onChange={(v) => {
                          setAuditAction(v);
                          setAuditPage(1);
                        }}
                        options={[
                          { value: 'INSERT', label: 'INSERT' },
                          { value: 'UPDATE', label: 'UPDATE' },
                          { value: 'DELETE', label: 'DELETE' },
                        ]}
                      />
                    </Col>
                    <Col span={6}>
                      {renderDateRangePicker(setAuditDateRange, setAuditPage)}
                    </Col>
                  </Row>
                </Card>
                <Card size="small">
                  <Table
                    columns={auditColumns}
                    dataSource={auditLogs}
                    rowKey="audit_id"
                    loading={auditLoading}
                    size="small"
                    scroll={{ x: 900 }}
                    pagination={{
                      current: auditPage,
                      pageSize: auditPageSize,
                      total: auditTotal,
                      showSizeChanger: true,
                      showTotal: (total) => t('common:pagination.totalItems', { count: total }),
                      onChange: (p, ps) => {
                        setAuditPage(p);
                        setAuditPageSize(ps);
                      },
                    }}
                  />
                </Card>
              </>
            ),
          },
        ]}
      />

      <Modal
        title={t('analytics:audit.changeDetailTitle')}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailLog(null); }}
        footer={null}
        width={700}
      >
        {detailLog && (
          <>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={t('analytics:audit.auditColumnTable')}>
                {ENTITY_LABELS[detailLog.entity_type] || detailLog.entity_type}
              </Descriptions.Item>
              <Descriptions.Item label={t('analytics:audit.auditColumnId')}>
                {detailLog.entity_id}
              </Descriptions.Item>
              <Descriptions.Item label={t('analytics:audit.auditColumnAction')}>
                <Tag color={ACTION_COLORS[detailLog.action]}>
                  {detailLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={t('analytics:audit.auditColumnTime')}>
                {detailLog.action_at?.replace('T', ' ').substring(0, 19)}
              </Descriptions.Item>
            </Descriptions>

            {detailLog.old_values && (
              <Card
                size="small"
                title={t('analytics:audit.beforeChange')}
                style={{ marginTop: 16 }}
              >
                <pre style={{
                  fontSize: 12, maxHeight: 200,
                  overflow: 'auto', margin: 0,
                }}>
                  {JSON.stringify(detailLog.old_values, null, 2)}
                </pre>
              </Card>
            )}
            {detailLog.new_values && (
              <Card
                size="small"
                title={t('analytics:audit.afterChange')}
                style={{ marginTop: 8 }}
              >
                <pre style={{
                  fontSize: 12, maxHeight: 200,
                  overflow: 'auto', margin: 0,
                }}>
                  {JSON.stringify(detailLog.new_values, null, 2)}
                </pre>
              </Card>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsPage;

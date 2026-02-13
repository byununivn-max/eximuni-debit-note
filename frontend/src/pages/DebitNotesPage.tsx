import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form, Select, DatePicker,
  InputNumber, message, Card, Descriptions, Timeline, Divider, Popconfirm, Input,
} from 'antd';
import {
  PlusOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SendOutlined, EyeOutlined, HistoryOutlined, FileExcelOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { DebitNote, Client, ExchangeRate, WorkflowEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DebitNotesPage: React.FC = () => {
  const { t } = useTranslation(['trading', 'common']);
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [selectedDN, setSelectedDN] = useState<DebitNote | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowEntry[]>([]);
  const [latestRate, setLatestRate] = useState<number>(26446);
  const [exporting, setExporting] = useState<number | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dnRes, cRes] = await Promise.all([
        api.get('/api/v1/debit-notes?limit=100'),
        api.get('/api/v1/clients?limit=200'),
      ]);
      setDebitNotes(dnRes.data.items);
      setClients(cRes.data.items);
      try {
        const rRes = await api.get('/api/v1/exchange-rates/latest');
        setLatestRate(Number(rRes.data.rate));
      } catch { /* 환율 조회 실패 시 기본값 유지 */ }
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('trading:debitNotes.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        client_id: values.client_id,
        period_from: values.period[0].format('YYYY-MM-DD'),
        period_to: values.period[1].format('YYYY-MM-DD'),
        exchange_rate: values.exchange_rate,
        sheet_type: values.sheet_type || 'ALL',
        notes: values.notes,
      };
      await api.post('/api/v1/debit-notes', payload);
      message.success(t('common:message.createSuccess'));
      setCreateModal(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.createFailed'));
    }
  };

  const handleAction = async (id: number, action: string, comment?: string) => {
    try {
      await api.post(`/api/v1/debit-notes/${id}/${action}`, { comment });
      message.success(`${action} ${t('common:message.success')}`);
      fetchData();
      setDetailModal(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.failed'));
    }
  };

  const showDetail = async (dn: DebitNote) => {
    try {
      const res = await api.get(`/api/v1/debit-notes/${dn.debit_note_id}`);
      setSelectedDN(res.data);
      setDetailModal(true);
    } catch {
      message.error(t('common:message.fetchFailed'));
    }
  };

  const showHistory = async (dn: DebitNote) => {
    try {
      const res = await api.get(`/api/v1/debit-notes/${dn.debit_note_id}/workflows`);
      setWorkflows(res.data);
      setSelectedDN(dn);
      setHistoryModal(true);
    } catch {
      message.error(t('common:message.fetchFailed'));
    }
  };

  const handleExportExcel = async (dn: DebitNote) => {
    setExporting(dn.debit_note_id);
    try {
      const res = await api.post(
        `/api/v1/debit-notes/${dn.debit_note_id}/export-excel`,
        {},
        { responseType: 'blob' },
      );
      // 파일명 추출
      const disposition = res.headers['content-disposition'];
      let filename = `DebitNote_${dn.debit_note_number || dn.debit_note_id}.xlsx`;
      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }
      // 다운로드 트리거
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(t('common:message.exportSuccess'));
      fetchData(); // 상태 갱신 (EXPORTED)
    } catch (err: any) {
      // blob 응답에서 에러 시 JSON 파싱
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message.error(json.detail || t('common:message.exportFailed'));
        } catch { message.error(t('common:message.exportFailed')); }
      } else {
        message.error(err.response?.data?.detail || t('common:message.exportFailed'));
      }
    } finally {
      setExporting(null);
    }
  };

  const clientName = (id: number) => clients.find(c => c.client_id === id)?.client_code || String(id);

  const statusColor: Record<string, string> = {
    DRAFT: 'default', PENDING_REVIEW: 'processing', APPROVED: 'success',
    REJECTED: 'error', EXPORTED: 'purple',
  };

  const columns = [
    { title: t('trading:debitNotes.columnDnNumber'), dataIndex: 'debit_note_number', key: 'number', width: 170 },
    { title: t('trading:debitNotes.columnClient'), key: 'client', width: 120,
      render: (_: any, r: DebitNote) => clientName(r.client_id),
    },
    { title: t('trading:debitNotes.columnPeriod'), key: 'period', width: 200,
      render: (_: any, r: DebitNote) => `${r.period_from} ~ ${r.period_to}`,
    },
    { title: t('trading:debitNotes.columnLines'), dataIndex: 'total_lines', key: 'lines', width: 60, align: 'center' as const },
    { title: t('trading:debitNotes.columnUsd'), dataIndex: 'total_usd', key: 'usd', width: 120, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    { title: t('trading:debitNotes.columnVndTotal'), dataIndex: 'grand_total_vnd', key: 'vnd', width: 150, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    { title: t('trading:debitNotes.columnStatus'), dataIndex: 'status', key: 'status', width: 140,
      render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    { title: t('trading:debitNotes.columnAction'), key: 'action', width: 280,
      render: (_: any, r: DebitNote) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)}>{t('common:button.detail')}</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => showHistory(r)}>{t('trading:debitNotes.historyTitle')}</Button>
          {(r.status === 'APPROVED' || r.status === 'EXPORTED') && (
            <Button size="small" type="primary" icon={<FileExcelOutlined />}
              loading={exporting === r.debit_note_id}
              onClick={() => handleExportExcel(r)}
              style={{ background: '#217346' }}>
              Excel
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('trading:debitNotes.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          form.resetFields();
          form.setFieldsValue({ exchange_rate: latestRate, sheet_type: 'ALL' });
          setCreateModal(true);
        }}>
          {t('trading:debitNotes.createButton')}
        </Button>
      </Space>

      <Card size="small">
        <Table columns={columns} dataSource={debitNotes} rowKey="debit_note_id"
          loading={loading} size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 15 }} />
      </Card>

      {/* 생성 모달 */}
      <Modal title={t('trading:debitNotes.createTitle')} open={createModal} onOk={handleCreate}
        onCancel={() => setCreateModal(false)} okText={t('common:button.create')} cancelText={t('common:button.cancel')} width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="client_id" label={t('trading:debitNotes.formClient')} rules={[{ required: true }]}>
            <Select options={clients.map(c => ({ value: c.client_id, label: `${c.client_code} - ${c.client_name}` }))} />
          </Form.Item>
          <Form.Item name="period" label={t('trading:debitNotes.formPeriod')} rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="exchange_rate" label={t('trading:debitNotes.formExchangeRate')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="sheet_type" label={t('trading:debitNotes.formSheetType')}>
            <Select options={[
              { value: 'ALL', label: t('trading:debitNotes.sheetAll') },
              { value: 'IMPORT', label: 'IMPORT' },
              { value: 'EXPORT', label: 'EXPORT' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label={t('trading:debitNotes.formMemo')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 모달 */}
      <Modal title={`${t('trading:debitNotes.detailTitle')} - ${selectedDN?.debit_note_number}`}
        open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={900}>
        {selectedDN && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label={t('trading:debitNotes.descDnNumber')}>{selectedDN.debit_note_number}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descClient')}>{clientName(selectedDN.client_id)}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descPeriod')}>{selectedDN.period_from} ~ {selectedDN.period_to}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descExchangeRate')}>{Number(selectedDN.exchange_rate).toLocaleString()} VND</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descUsdTotal')}>{Number(selectedDN.total_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descVndTotal')}>{Number(selectedDN.total_vnd).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descVat')}>{Number(selectedDN.total_vat).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descGrandTotal')}>{Number(selectedDN.grand_total_vnd).toLocaleString()} VND</Descriptions.Item>
              <Descriptions.Item label={t('trading:debitNotes.descStatus')} span={2}>
                <Tag color={statusColor[selectedDN.status]}>{selectedDN.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider>{t('trading:debitNotes.lineItems', { count: selectedDN.lines.length })}</Divider>
            <Table
              dataSource={selectedDN.lines}
              rowKey="line_id"
              size="small"
              pagination={false}
              columns={[
                { title: '#', dataIndex: 'line_no', width: 50 },
                { title: 'Shipment ID', dataIndex: 'shipment_id', width: 110 },
                { title: 'Freight (USD)', dataIndex: 'freight_usd', width: 120, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                },
                { title: 'Local (USD)', dataIndex: 'local_charges_usd', width: 120, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                },
                { title: 'Total USD', dataIndex: 'total_usd', width: 120, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }),
                },
                { title: 'VND', dataIndex: 'total_vnd', width: 140, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(),
                },
                { title: 'VAT', dataIndex: 'vat_amount', width: 120, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(),
                },
                { title: 'Grand Total', dataIndex: 'grand_total_vnd', width: 150, align: 'right' as const,
                  render: (v: number) => Number(v).toLocaleString(),
                },
              ]}
            />

            <Divider />
            <Space>
              {selectedDN.status === 'DRAFT' && (
                <Popconfirm title={t('trading:debitNotes.submitConfirm')} onConfirm={() => handleAction(selectedDN.debit_note_id, 'submit-for-review')}>
                  <Button type="primary" icon={<SendOutlined />}>{t('trading:debitNotes.submitReview')}</Button>
                </Popconfirm>
              )}
              {selectedDN.status === 'PENDING_REVIEW' && selectedDN.created_by !== user?.user_id && (
                <>
                  <Popconfirm title={t('trading:debitNotes.approveConfirm')} onConfirm={() => handleAction(selectedDN.debit_note_id, 'approve', t('common:button.approve'))}>
                    <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a' }}>{t('common:button.approve')}</Button>
                  </Popconfirm>
                  <Popconfirm title={t('trading:debitNotes.rejectConfirm')} onConfirm={() => handleAction(selectedDN.debit_note_id, 'reject', t('common:button.reject'))}>
                    <Button danger icon={<CloseCircleOutlined />}>{t('common:button.reject')}</Button>
                  </Popconfirm>
                </>
              )}
              {selectedDN.status === 'PENDING_REVIEW' && selectedDN.created_by === user?.user_id && (
                <Text type="secondary">{t('trading:debitNotes.selfCreatedNote')}</Text>
              )}
              {(selectedDN.status === 'APPROVED' || selectedDN.status === 'EXPORTED') && (
                <Button type="primary" icon={<DownloadOutlined />}
                  loading={exporting === selectedDN.debit_note_id}
                  onClick={() => handleExportExcel(selectedDN)}
                  style={{ background: '#217346' }}>
                  {t('trading:debitNotes.excelDownload')}
                </Button>
              )}
            </Space>
          </div>
        )}
      </Modal>

      {/* 이력 모달 */}
      <Modal title={`${t('trading:debitNotes.historyTitle')} - ${selectedDN?.debit_note_number}`}
        open={historyModal} onCancel={() => setHistoryModal(false)} footer={null} width={500}>
        <Timeline items={workflows.map(w => ({
          color: w.action === 'APPROVED' ? 'green' : w.action === 'REJECTED' ? 'red' : 'blue',
          children: (
            <div>
              <Text strong>{w.action}</Text>
              <br />
              <Text type="secondary">{w.from_status} → {w.to_status}</Text>
              {w.comment && <><br /><Text>{w.comment}</Text></>}
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>{w.created_at?.split('T')[0]}</Text>
            </div>
          ),
        }))} />
      </Modal>
    </div>
  );
};

export default DebitNotesPage;

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
import api from '../services/api';
import type { DebitNote, Client, ExchangeRate, WorkflowEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const DebitNotesPage: React.FC = () => {
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
      message.error(err.response?.data?.detail || '데이터 조회 실패');
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
      message.success('Debit Note 생성 완료');
      setCreateModal(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '생성 실패');
    }
  };

  const handleAction = async (id: number, action: string, comment?: string) => {
    try {
      await api.post(`/api/v1/debit-notes/${id}/${action}`, { comment });
      message.success(`${action} 완료`);
      fetchData();
      setDetailModal(false);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '처리 실패');
    }
  };

  const showDetail = async (dn: DebitNote) => {
    try {
      const res = await api.get(`/api/v1/debit-notes/${dn.debit_note_id}`);
      setSelectedDN(res.data);
      setDetailModal(true);
    } catch {
      message.error('상세 조회 실패');
    }
  };

  const showHistory = async (dn: DebitNote) => {
    try {
      const res = await api.get(`/api/v1/debit-notes/${dn.debit_note_id}/workflows`);
      setWorkflows(res.data);
      setSelectedDN(dn);
      setHistoryModal(true);
    } catch {
      message.error('이력 조회 실패');
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
      message.success('Excel 다운로드 완료');
      fetchData(); // 상태 갱신 (EXPORTED)
    } catch (err: any) {
      // blob 응답에서 에러 시 JSON 파싱
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          message.error(json.detail || 'Excel 출력 실패');
        } catch { message.error('Excel 출력 실패'); }
      } else {
        message.error(err.response?.data?.detail || 'Excel 출력 실패');
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
    { title: 'DN 번호', dataIndex: 'debit_note_number', key: 'number', width: 170 },
    { title: '거래처', key: 'client', width: 120,
      render: (_: any, r: DebitNote) => clientName(r.client_id),
    },
    { title: '기간', key: 'period', width: 200,
      render: (_: any, r: DebitNote) => `${r.period_from} ~ ${r.period_to}`,
    },
    { title: '건수', dataIndex: 'total_lines', key: 'lines', width: 60, align: 'center' as const },
    { title: 'USD', dataIndex: 'total_usd', key: 'usd', width: 120, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 }),
    },
    { title: 'VND (합계)', dataIndex: 'grand_total_vnd', key: 'vnd', width: 150, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    { title: '상태', dataIndex: 'status', key: 'status', width: 140,
      render: (s: string) => <Tag color={statusColor[s]}>{s}</Tag>,
    },
    { title: '액션', key: 'action', width: 280,
      render: (_: any, r: DebitNote) => (
        <Space size="small">
          <Button size="small" icon={<EyeOutlined />} onClick={() => showDetail(r)}>상세</Button>
          <Button size="small" icon={<HistoryOutlined />} onClick={() => showHistory(r)}>이력</Button>
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
        <Title level={4} style={{ margin: 0 }}>Debit Note</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => {
          form.resetFields();
          form.setFieldsValue({ exchange_rate: latestRate, sheet_type: 'ALL' });
          setCreateModal(true);
        }}>
          Debit Note 생성
        </Button>
      </Space>

      <Card size="small">
        <Table columns={columns} dataSource={debitNotes} rowKey="debit_note_id"
          loading={loading} size="small" scroll={{ x: 1200 }} pagination={{ pageSize: 15 }} />
      </Card>

      {/* 생성 모달 */}
      <Modal title="Debit Note 생성" open={createModal} onOk={handleCreate}
        onCancel={() => setCreateModal(false)} okText="생성" cancelText="취소" width={500}>
        <Form form={form} layout="vertical">
          <Form.Item name="client_id" label="거래처" rules={[{ required: true }]}>
            <Select options={clients.map(c => ({ value: c.client_id, label: `${c.client_code} - ${c.client_name}` }))} />
          </Form.Item>
          <Form.Item name="period" label="청구 기간" rules={[{ required: true }]}>
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="exchange_rate" label="환율 (VND/USD)" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
          <Form.Item name="sheet_type" label="시트 유형">
            <Select options={[
              { value: 'ALL', label: '전체 (IMPORT + EXPORT)' },
              { value: 'IMPORT', label: 'IMPORT' },
              { value: 'EXPORT', label: 'EXPORT' },
            ]} />
          </Form.Item>
          <Form.Item name="notes" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 상세 모달 */}
      <Modal title={`Debit Note 상세 - ${selectedDN?.debit_note_number}`}
        open={detailModal} onCancel={() => setDetailModal(false)} footer={null} width={900}>
        {selectedDN && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="DN 번호">{selectedDN.debit_note_number}</Descriptions.Item>
              <Descriptions.Item label="거래처">{clientName(selectedDN.client_id)}</Descriptions.Item>
              <Descriptions.Item label="기간">{selectedDN.period_from} ~ {selectedDN.period_to}</Descriptions.Item>
              <Descriptions.Item label="환율">{Number(selectedDN.exchange_rate).toLocaleString()} VND</Descriptions.Item>
              <Descriptions.Item label="USD 합계">{Number(selectedDN.total_usd).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Descriptions.Item>
              <Descriptions.Item label="VND 합계">{Number(selectedDN.total_vnd).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="VAT">{Number(selectedDN.total_vat).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="최종 합계">{Number(selectedDN.grand_total_vnd).toLocaleString()} VND</Descriptions.Item>
              <Descriptions.Item label="상태" span={2}>
                <Tag color={statusColor[selectedDN.status]}>{selectedDN.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Divider>라인 항목 ({selectedDN.lines.length}건)</Divider>
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
                <Popconfirm title="검토 제출하시겠습니까?" onConfirm={() => handleAction(selectedDN.debit_note_id, 'submit-for-review')}>
                  <Button type="primary" icon={<SendOutlined />}>검토 제출</Button>
                </Popconfirm>
              )}
              {selectedDN.status === 'PENDING_REVIEW' && selectedDN.created_by !== user?.user_id && (
                <>
                  <Popconfirm title="승인하시겠습니까?" onConfirm={() => handleAction(selectedDN.debit_note_id, 'approve', '승인')}>
                    <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#52c41a' }}>승인</Button>
                  </Popconfirm>
                  <Popconfirm title="거절하시겠습니까?" onConfirm={() => handleAction(selectedDN.debit_note_id, 'reject', '거절')}>
                    <Button danger icon={<CloseCircleOutlined />}>거절</Button>
                  </Popconfirm>
                </>
              )}
              {selectedDN.status === 'PENDING_REVIEW' && selectedDN.created_by === user?.user_id && (
                <Text type="secondary">본인이 생성한 Debit Note는 다른 사용자가 승인해야 합니다.</Text>
              )}
              {(selectedDN.status === 'APPROVED' || selectedDN.status === 'EXPORTED') && (
                <Button type="primary" icon={<DownloadOutlined />}
                  loading={exporting === selectedDN.debit_note_id}
                  onClick={() => handleExportExcel(selectedDN)}
                  style={{ background: '#217346' }}>
                  Excel 다운로드
                </Button>
              )}
            </Space>
          </div>
        )}
      </Modal>

      {/* 이력 모달 */}
      <Modal title={`워크플로우 이력 - ${selectedDN?.debit_note_number}`}
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

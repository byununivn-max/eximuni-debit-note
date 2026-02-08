import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form, Input, Select,
  DatePicker, InputNumber, message, Card, Divider, Row, Col,
} from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import type { Shipment, Client, FeeItem } from '../types';

const { Title } = Typography;

const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [clientFilter, setClientFilter] = useState<number | undefined>();
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = clientFilter ? `?client_id=${clientFilter}&limit=100` : '?limit=100';
      const [sRes, cRes, fRes] = await Promise.all([
        api.get(`/api/v1/shipments${params}`),
        api.get('/api/v1/clients?limit=200'),
        api.get('/api/v1/fee-items'),
      ]);
      setShipments(sRes.data.items);
      setClients(cRes.data.items);
      setFeeItems(Array.isArray(fRes.data) ? fRes.data : fRes.data.items);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [clientFilter]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        delivery_date: values.delivery_date?.format('YYYY-MM-DD'),
        fee_details: (values.fee_details || [])
          .filter((f: any) => f && f.fee_item_id && f.amount_usd > 0)
          .map((f: any) => ({ ...f, currency: f.currency || 'USD' })),
      };
      const res = await api.post('/api/v1/shipments', payload);
      if (res.data.duplicates?.length > 0) {
        message.warning(`중복 감지: ${res.data.duplicates.map((d: any) => `${d.duplicate_type}=${d.duplicate_value}`).join(', ')}`);
      } else {
        message.success('거래 데이터 등록 완료');
      }
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '등록 실패');
    }
  };

  const statusColor: Record<string, string> = {
    ACTIVE: 'green', BILLED: 'blue', CANCELLED: 'default',
  };

  const columns = [
    { title: '날짜', dataIndex: 'delivery_date', key: 'date', width: 110 },
    { title: 'Invoice', dataIndex: 'invoice_no', key: 'inv', width: 140 },
    { title: 'MBL', dataIndex: 'mbl', key: 'mbl', width: 140 },
    { title: 'HBL', dataIndex: 'hbl', key: 'hbl', width: 140 },
    { title: 'Term', dataIndex: 'term', key: 'term', width: 70 },
    { title: '유형', dataIndex: 'shipment_type', key: 'type', width: 90,
      render: (v: string) => <Tag color={v === 'IMPORT' ? 'blue' : 'orange'}>{v}</Tag>,
    },
    { title: '상태', dataIndex: 'status', key: 'status', width: 90,
      render: (v: string) => <Tag color={statusColor[v]}>{v}</Tag>,
    },
    { title: '중복', dataIndex: 'is_duplicate', key: 'dup', width: 60,
      render: (v: boolean) => v ? <WarningOutlined style={{ color: '#faad14' }} /> : null,
    },
    { title: '비용항목', key: 'fees', width: 80,
      render: (_: any, r: Shipment) => r.fee_details?.length || 0,
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Title level={4} style={{ margin: 0 }}>거래 데이터</Title>
          <Select
            placeholder="거래처 필터"
            allowClear
            style={{ width: 200 }}
            onChange={(v) => setClientFilter(v)}
            options={clients.map(c => ({ value: c.client_id, label: c.client_code }))}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          거래 등록
        </Button>
      </Space>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={shipments}
          rowKey="shipment_id"
          loading={loading}
          size="small"
          scroll={{ x: 950 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="거래 데이터 등록"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText="등록"
        cancelText="취소"
        width={700}
      >
        <Form form={form} layout="vertical" initialValues={{ shipment_type: 'IMPORT', term: 'FOB' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="client_id" label="거래처" rules={[{ required: true }]}>
                <Select options={clients.map(c => ({ value: c.client_id, label: c.client_code }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="shipment_type" label="유형" rules={[{ required: true }]}>
                <Select options={[{ value: 'IMPORT', label: 'IMPORT' }, { value: 'EXPORT', label: 'EXPORT' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="delivery_date" label="선적일">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="invoice_no" label="Invoice No.">
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="term" label="Term">
                <Select options={['FOB', 'EXW', 'DAP', 'CIF', 'CFR', 'DDP'].map(v => ({ value: v, label: v }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="mbl" label="MBL"><Input /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hbl" label="HBL"><Input /></Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="cd_no" label="CD No."><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="no_of_pkgs" label="포장수"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="gross_weight" label="총중량"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>

          <Divider>비용 항목</Divider>
          <Form.List name="fee_details">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name }) => (
                  <Row gutter={8} key={key} align="middle">
                    <Col span={10}>
                      <Form.Item name={[name, 'fee_item_id']} rules={[{ required: true }]}>
                        <Select placeholder="비용 항목" options={feeItems.map(f => ({ value: f.fee_item_id, label: f.item_name }))} />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name={[name, 'amount_usd']} rules={[{ required: true }]}>
                        <InputNumber placeholder="USD" style={{ width: '100%' }} min={0} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Button danger onClick={() => remove(name)} size="small">삭제</Button>
                    </Col>
                  </Row>
                ))}
                <Button type="dashed" onClick={() => add({ currency: 'USD' })} block icon={<PlusOutlined />}>
                  비용 항목 추가
                </Button>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </div>
  );
};

export default ShipmentsPage;

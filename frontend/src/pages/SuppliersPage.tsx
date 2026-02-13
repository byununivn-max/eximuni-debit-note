import React, { useEffect, useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form, Input, Select,
  message, Card, Row, Col,
} from 'antd';
import { PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { Supplier } from '../types/trading';

const { Title } = Typography;

const SUPPLIER_TYPE_KEYS: Record<string, string> = {
  shipping_line: 'common:supplierType.shipping_line',
  trucking: 'common:supplierType.trucking',
  customs_broker: 'common:supplierType.customs_broker',
  co_agent: 'common:supplierType.co_agent',
  other: 'common:supplierType.other',
};

const typeColors: Record<string, string> = {
  shipping_line: 'blue',
  trucking: 'green',
  customs_broker: 'orange',
  co_agent: 'purple',
  other: 'default',
};

const SuppliersPage: React.FC = () => {
  const { t } = useTranslation(['trading', 'common']);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (typeFilter) params.supplier_type = typeFilter;

      const res = await api.get('/api/v1/suppliers', { params });
      setSuppliers(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('trading:suppliers.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, typeFilter]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await api.put(`/api/v1/suppliers/${editing.supplier_id}`, values);
        message.success(t('trading:suppliers.editSuccess'));
      } else {
        await api.post('/api/v1/suppliers', values);
        message.success(t('trading:suppliers.createSuccess'));
      }
      setModalOpen(false);
      form.resetFields();
      setEditing(null);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.saveFailed'));
    }
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    form.setFieldsValue(supplier);
    setModalOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ supplier_type: 'other', currency: 'VND' });
    setModalOpen(true);
  };

  const columns = [
    { title: t('trading:suppliers.columnCode'), dataIndex: 'supplier_code', key: 'code', width: 120 },
    { title: t('trading:suppliers.columnName'), dataIndex: 'supplier_name', key: 'name', width: 250 },
    { title: t('trading:suppliers.columnType'), dataIndex: 'supplier_type', key: 'type', width: 100,
      render: (v: string) => (
        <Tag color={typeColors[v] || 'default'}>{SUPPLIER_TYPE_KEYS[v] ? t(SUPPLIER_TYPE_KEYS[v]) : v}</Tag>
      ),
    },
    { title: t('trading:suppliers.columnContact'), dataIndex: 'contact_person', key: 'contact', width: 120 },
    { title: t('trading:suppliers.columnEmail'), dataIndex: 'contact_email', key: 'email', width: 180 },
    { title: t('trading:suppliers.columnPhone'), dataIndex: 'contact_phone', key: 'phone', width: 130 },
    { title: t('trading:suppliers.columnPaymentTerms'), dataIndex: 'payment_terms', key: 'terms', width: 100 },
    { title: t('trading:suppliers.columnCurrency'), dataIndex: 'currency', key: 'currency', width: 70 },
    { title: t('trading:suppliers.columnStatus'), dataIndex: 'is_active', key: 'active', width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? t('common:status.active') : t('common:status.inactive')}</Tag>
      ),
    },
    { title: '', key: 'action', width: 80,
      render: (_: any, r: Supplier) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>
          {t('common:button.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('trading:suppliers.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('trading:suppliers.createButton')}
        </Button>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder={t('trading:suppliers.searchPlaceholder')}
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={(e) => {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }}
              onChange={(e) => {
                if (!e.target.value) { setSearch(''); setPage(1); }
              }}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder={t('common:filter.typeFilter')}
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={Object.entries(SUPPLIER_TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={suppliers}
          rowKey="supplier_id"
          loading={loading}
          size="small"
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>

      <Modal
        title={editing ? t('trading:suppliers.editTitle') : t('trading:suppliers.createTitle')}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => { setModalOpen(false); setEditing(null); }}
        okText={t('common:button.save')}
        cancelText={t('common:button.cancel')}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="supplier_code" label={t('trading:suppliers.formCode')}
                rules={[{ required: true }]}
              >
                <Input placeholder="SL-001" disabled={!!editing} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item
                name="supplier_name" label={t('trading:suppliers.formName')}
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="supplier_type" label={t('trading:suppliers.formType')} rules={[{ required: true }]}>
                <Select options={Object.entries(SUPPLIER_TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="currency" label={t('trading:suppliers.formCurrency')}>
                <Select options={[
                  { value: 'VND', label: 'VND' },
                  { value: 'USD', label: 'USD' },
                  { value: 'KRW', label: 'KRW' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="payment_terms" label={t('trading:suppliers.formPaymentTerms')}>
                <Select allowClear options={[
                  { value: 'COD', label: 'COD' },
                  { value: 'NET15', label: 'NET 15' },
                  { value: 'NET30', label: 'NET 30' },
                  { value: 'NET60', label: 'NET 60' },
                ]} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="contact_person" label={t('trading:suppliers.formContact')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contact_email" label={t('trading:suppliers.formEmail')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contact_phone" label={t('trading:suppliers.formPhone')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="tax_id" label={t('trading:suppliers.formTaxId')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bank_name" label={t('trading:suppliers.formBankName')}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="bank_account" label={t('trading:suppliers.formBankAccount')}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label={t('trading:suppliers.formAddress')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes" label={t('trading:suppliers.formNotes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuppliersPage;

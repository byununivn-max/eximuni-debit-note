import React, { useEffect, useState } from 'react';
import { Table, Button, Space, Typography, Modal, Form, DatePicker, InputNumber, message, Card, Statistic } from 'antd';
import { PlusOutlined, DollarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { ExchangeRate } from '../types';

const { Title } = Typography;

const ExchangeRatesPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/exchange-rates?limit=50');
      setRates(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('analytics:masterData.exchangeRates.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRates(); }, []);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      await api.post('/api/v1/exchange-rates', {
        rate: values.rate,
        rate_date: values.rate_date.format('YYYY-MM-DD'),
        source: 'manual',
      });
      message.success(t('analytics:masterData.exchangeRates.createSuccess'));
      setModalOpen(false);
      form.resetFields();
      fetchRates();
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('common:message.createFailed'));
    }
  };

  const latestRate = rates[0];

  const columns = [
    { title: t('analytics:masterData.exchangeRates.columnDate'), dataIndex: 'rate_date', key: 'date', width: 120 },
    { title: t('analytics:masterData.exchangeRates.columnRate'), dataIndex: 'rate', key: 'rate', width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    { title: t('analytics:masterData.exchangeRates.columnSource'), dataIndex: 'source', key: 'source', width: 100 },
  ];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{t('analytics:masterData.exchangeRates.title')}</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
          {t('analytics:masterData.exchangeRates.createButton')}
        </Button>
      </Space>

      {latestRate && (
        <Card style={{ marginBottom: 16 }}>
          <Statistic title={t('analytics:masterData.exchangeRates.latestRate')} value={Number(latestRate.rate)}
            prefix={<DollarOutlined />} suffix="VND"
            formatter={(v) => Number(v).toLocaleString()} />
          <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
            {t('analytics:masterData.exchangeRates.referenceDate')}: {latestRate.rate_date}
          </div>
        </Card>
      )}

      <Card size="small">
        <Table columns={columns} dataSource={rates} rowKey="rate_id"
          loading={loading} size="small" pagination={{ pageSize: 20 }} />
      </Card>

      <Modal title={t('analytics:masterData.exchangeRates.createTitle')} open={modalOpen} onOk={handleCreate}
        onCancel={() => setModalOpen(false)} okText={t('common:button.create')} cancelText={t('common:button.cancel')}>
        <Form form={form} layout="vertical">
          <Form.Item name="rate_date" label={t('analytics:masterData.exchangeRates.formDate')} rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="rate" label={t('analytics:masterData.exchangeRates.formRate')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} placeholder="26446"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExchangeRatesPage;

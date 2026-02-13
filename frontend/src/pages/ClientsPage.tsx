import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, message, Card,
  Descriptions, Row, Col, Select,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { MssqlClient, MssqlClientDetail, PaginatedResponse } from '../types/mssql';

const { Title } = Typography;

const ClientsPage: React.FC = () => {
  const { t } = useTranslation(['analytics', 'common']);
  const [clients, setClients] = useState<MssqlClient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<MssqlClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
        active_only: activeOnly,
      };
      if (search) params.search = search;

      const res = await api.get<PaginatedResponse<MssqlClient>>(
        '/api/v1/mssql/clients', { params }
      );
      setClients(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('analytics:masterData.clients.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, [page, pageSize, search, activeOnly]);

  const showDetail = async (clientId: number) => {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await api.get<MssqlClientDetail>(
        `/api/v1/mssql/clients/${clientId}`
      );
      setDetailData(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || t('analytics:masterData.clients.detailFetchFailed'));
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: t('analytics:masterData.clients.columnId'), dataIndex: 'id_clients', key: 'id', width: 70 },
    { title: t('analytics:masterData.clients.columnCompany'), dataIndex: 'company_name', key: 'company', width: 250 },
    { title: t('analytics:masterData.clients.columnName'), key: 'name', width: 150,
      render: (_: any, r: MssqlClient) =>
        [r.first_name, r.last_name].filter(Boolean).join(' ') || '-',
    },
    { title: t('analytics:masterData.clients.columnEmail'), dataIndex: 'email', key: 'email', width: 200 },
    { title: t('analytics:masterData.clients.columnPhone'), dataIndex: 'phone_number', key: 'phone', width: 140 },
    { title: t('analytics:masterData.clients.columnType'), dataIndex: 'clients_type', key: 'type', width: 100,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: t('analytics:masterData.clients.columnStatus'), dataIndex: 'active', key: 'active', width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>
          {v ? t('common:status.active') : t('common:status.inactive')}
        </Tag>
      ),
    },
    { title: '', key: 'action', width: 80,
      render: (_: any, r: MssqlClient) => (
        <a onClick={() => showDetail(r.id_clients)}>
          <EyeOutlined /> {t('common:button.detail')}
        </a>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('analytics:masterData.clients.title')}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder={t('analytics:masterData.clients.searchPlaceholder')}
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
              value={activeOnly}
              style={{ width: '100%' }}
              onChange={(v) => { setActiveOnly(v); setPage(1); }}
              options={[
                { value: true, label: t('common:filter.activeOnly') },
                { value: false, label: t('common:filter.all') },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id_clients"
          loading={loading}
          size="small"
          scroll={{ x: 1100 }}
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
        title={t('analytics:masterData.clients.detailTitle')}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailData(null); }}
        footer={null}
        width={700}
        loading={detailLoading}
      >
        {detailData && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label={t('analytics:masterData.clients.descCompany')} span={2}>
              {detailData.company_name}
            </Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descName')}>
              {[detailData.first_name, detailData.last_name].filter(Boolean).join(' ')}
            </Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descEmail')}>{detailData.email}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descPhone')}>{detailData.phone_number}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descType')}>{detailData.clients_type}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descGender')}>{detailData.gender}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descLanguage')}>{detailData.language}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descPosition')}>{detailData.position}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descIndustry')}>{detailData.industry}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descService')}>{detailData.service}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descFdi')}>{detailData.fdi}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descProvince')}>{detailData.province}</Descriptions.Item>
            <Descriptions.Item label={t('analytics:masterData.clients.descCampaign')}>{detailData.campaign}</Descriptions.Item>
            {detailData.note && (
              <Descriptions.Item label={t('analytics:masterData.clients.descMemo')} span={2}>
                {detailData.note}
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default ClientsPage;

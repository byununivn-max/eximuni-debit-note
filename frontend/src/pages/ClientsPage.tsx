import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, message, Card,
  Descriptions, Row, Col, Select,
} from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../services/api';
import type { MssqlClient, MssqlClientDetail, PaginatedResponse } from '../types/mssql';

const { Title } = Typography;

const ClientsPage: React.FC = () => {
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
      message.error(err.response?.data?.detail || '거래처 목록 조회 실패');
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
      message.error(err.response?.data?.detail || '거래처 상세 조회 실패');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_clients', key: 'id', width: 70 },
    { title: '회사명', dataIndex: 'company_name', key: 'company', width: 250 },
    { title: '이름', key: 'name', width: 150,
      render: (_: any, r: MssqlClient) =>
        [r.first_name, r.last_name].filter(Boolean).join(' ') || '-',
    },
    { title: '이메일', dataIndex: 'email', key: 'email', width: 200 },
    { title: '전화', dataIndex: 'phone_number', key: 'phone', width: 140 },
    { title: '유형', dataIndex: 'clients_type', key: 'type', width: 100,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: '상태', dataIndex: 'active', key: 'active', width: 80,
      render: (v: boolean) => (
        <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag>
      ),
    },
    { title: '', key: 'action', width: 80,
      render: (_: any, r: MssqlClient) => (
        <a onClick={() => showDetail(r.id_clients)}>
          <EyeOutlined /> 상세
        </a>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>거래처 관리</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="회사명/이메일/이름 검색"
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
                { value: true, label: '활성만' },
                { value: false, label: '전체' },
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
        title="거래처 상세"
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setDetailData(null); }}
        footer={null}
        width={700}
        loading={detailLoading}
      >
        {detailData && (
          <Descriptions bordered size="small" column={2}>
            <Descriptions.Item label="회사명" span={2}>
              {detailData.company_name}
            </Descriptions.Item>
            <Descriptions.Item label="이름">
              {[detailData.first_name, detailData.last_name].filter(Boolean).join(' ')}
            </Descriptions.Item>
            <Descriptions.Item label="이메일">{detailData.email}</Descriptions.Item>
            <Descriptions.Item label="전화">{detailData.phone_number}</Descriptions.Item>
            <Descriptions.Item label="유형">{detailData.clients_type}</Descriptions.Item>
            <Descriptions.Item label="성별">{detailData.gender}</Descriptions.Item>
            <Descriptions.Item label="언어">{detailData.language}</Descriptions.Item>
            <Descriptions.Item label="직위">{detailData.position}</Descriptions.Item>
            <Descriptions.Item label="업종">{detailData.industry}</Descriptions.Item>
            <Descriptions.Item label="서비스">{detailData.service}</Descriptions.Item>
            <Descriptions.Item label="FDI">{detailData.fdi}</Descriptions.Item>
            <Descriptions.Item label="지역">{detailData.province}</Descriptions.Item>
            <Descriptions.Item label="캠페인">{detailData.campaign}</Descriptions.Item>
            {detailData.note && (
              <Descriptions.Item label="메모" span={2}>
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

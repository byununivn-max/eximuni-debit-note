import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Table, Tag, Spin } from 'antd';
import {
  FileTextOutlined, DollarOutlined, TeamOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import type { DebitNote, Client } from '../types';

const { Title } = Typography;

const DashboardPage: React.FC = () => {
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dnRes, clientRes] = await Promise.all([
          api.get('/api/v1/debit-notes?limit=10'),
          api.get('/api/v1/clients?limit=200'),
        ]);
        setDebitNotes(dnRes.data.items);
        setClients(clientRes.data.items);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const pendingCount = debitNotes.filter(d => d.status === 'PENDING_REVIEW').length;
  const draftCount = debitNotes.filter(d => d.status === 'DRAFT').length;
  const totalVnd = debitNotes
    .filter(d => d.status === 'APPROVED')
    .reduce((sum, d) => sum + Number(d.grand_total_vnd), 0);

  const statusColor: Record<string, string> = {
    DRAFT: 'default', PENDING_REVIEW: 'processing', APPROVED: 'success',
    REJECTED: 'error', EXPORTED: 'purple',
  };

  const columns = [
    { title: 'DN 번호', dataIndex: 'debit_note_number', key: 'number', width: 180 },
    { title: '거래처', dataIndex: 'client_name', key: 'client', width: 200,
      render: (_: any, r: DebitNote) => {
        const client = clients.find(c => c.client_id === r.client_id);
        return client?.client_code || r.client_id;
      }
    },
    { title: '기간', key: 'period', width: 200,
      render: (_: any, r: DebitNote) => `${r.period_from} ~ ${r.period_to}`,
    },
    { title: '합계 (VND)', dataIndex: 'grand_total_vnd', key: 'total', width: 160, align: 'right' as const,
      render: (v: number) => Number(v).toLocaleString(),
    },
    { title: '상태', dataIndex: 'status', key: 'status', width: 140,
      render: (s: string) => <Tag color={statusColor[s] || 'default'}>{s}</Tag>,
    },
    { title: '생성일', dataIndex: 'created_at', key: 'date', width: 120,
      render: (v: string) => v?.split('T')[0],
    },
  ];

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Title level={4}>Dashboard</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="미승인 Debit Note" value={pendingCount}
              prefix={<ClockCircleOutlined />} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="초안 (Draft)" value={draftCount}
              prefix={<FileTextOutlined />} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="승인 청구액 (VND)" value={totalVnd}
              prefix={<DollarOutlined />} valueStyle={{ color: '#52c41a' }}
              formatter={(v) => Number(v).toLocaleString()} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="등록 거래처" value={clients.length}
              prefix={<TeamOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card title="최근 Debit Note" size="small">
        <Table
          columns={columns}
          dataSource={debitNotes}
          rowKey="debit_note_id"
          pagination={false}
          size="small"
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default DashboardPage;

import React, { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Select, Typography, Button, Spin,
  Row, Col, Space, Popconfirm, message,
} from 'antd';
import {
  CalendarOutlined, LockOutlined, UnlockOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title } = Typography;

interface FiscalPeriodItem {
  period_id: number;
  fiscal_year: number;
  period_month: number;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: number | null;
}

const MONTH_LABELS = [
  '', '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

const FiscalPeriodsPage: React.FC = () => {
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
        `${year}년: ${res.data.created}건 생성, ${res.data.skipped}건 스킵`,
      );
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '기간 생성 실패');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = async (periodId: number) => {
    try {
      await api.post(`/api/v1/fiscal-periods/${periodId}/close`);
      message.success('기간 마감 완료');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '마감 실패');
    }
  };

  const handleReopen = async (periodId: number) => {
    try {
      await api.post(`/api/v1/fiscal-periods/${periodId}/reopen`);
      message.success('기간 마감 해제');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '마감 해제 실패');
    }
  };

  const closedCount = periods.filter(p => p.is_closed).length;
  const openCount = periods.filter(p => !p.is_closed).length;

  const columns = [
    {
      title: '월', dataIndex: 'period_month', key: 'month',
      width: 80, align: 'center' as const,
      render: (v: number) => <strong>{MONTH_LABELS[v]}</strong>,
    },
    {
      title: '시작일', dataIndex: 'start_date', key: 'start',
      width: 120, align: 'center' as const,
    },
    {
      title: '종료일', dataIndex: 'end_date', key: 'end',
      width: 120, align: 'center' as const,
    },
    {
      title: '상태', dataIndex: 'is_closed', key: 'status',
      width: 100, align: 'center' as const,
      render: (v: boolean) => v
        ? <Tag icon={<LockOutlined />} color="red">마감</Tag>
        : <Tag icon={<UnlockOutlined />} color="green">오픈</Tag>,
    },
    {
      title: '마감일시', dataIndex: 'closed_at', key: 'closed_at',
      width: 180,
      render: (v: string | null) => v
        ? new Date(v).toLocaleString('ko-KR')
        : '-',
    },
    {
      title: '작업', key: 'action', width: 120,
      align: 'center' as const,
      render: (_: any, r: FiscalPeriodItem) => r.is_closed ? (
        <Popconfirm
          title="이 기간의 마감을 해제하시겠습니까?"
          onConfirm={() => handleReopen(r.period_id)}
          okText="해제"
          cancelText="취소"
        >
          <Button size="small" icon={<UnlockOutlined />}>
            재개
          </Button>
        </Popconfirm>
      ) : (
        <Popconfirm
          title="이 기간을 마감하시겠습니까?"
          onConfirm={() => handleClose(r.period_id)}
          okText="마감"
          cancelText="취소"
        >
          <Button size="small" type="primary" icon={<LockOutlined />}>
            마감
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
            회계기간 관리
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
              title={`${year}년 12개월 회계기간을 생성하시겠습니까?`}
              onConfirm={handleGenerate}
              okText="생성"
              cancelText="취소"
            >
              <Button
                icon={<PlusOutlined />}
                loading={generating}
              >
                기간 생성
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
                <div style={{ color: '#999', fontSize: 12 }}>전체 기간</div>
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
                <div style={{ color: '#999', fontSize: 12 }}>오픈</div>
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
                <div style={{ color: '#999', fontSize: 12 }}>마감</div>
                <strong style={{ fontSize: 20, color: '#ff4d4f' }}>
                  {closedCount}
                </strong>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card
        title={`${year}년 회계기간 (${periods.length}개월)`}
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
            {year}년 회계기간이 없습니다. "기간 생성" 버튼을 클릭하세요.
          </div>
        )}
      </Card>
    </div>
  );
};

export default FiscalPeriodsPage;

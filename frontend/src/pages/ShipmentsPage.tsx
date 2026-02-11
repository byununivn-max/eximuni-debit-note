import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select, DatePicker,
  message, Card, Descriptions, Row, Col,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import type {
  MssqlDebitSharepoint, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const ShipmentsPage: React.FC = () => {
  const [data, setData] = useState<MssqlDebitSharepoint[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [imExFilter, setImExFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<MssqlDebitSharepoint | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (imExFilter) params.im_ex = imExFilter;
      if (statusFilter) params.debit_status = statusFilter;
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get<PaginatedResponse<MssqlDebitSharepoint>>(
        '/api/v1/mssql/debit-sharepoint', { params }
      );
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '거래 데이터 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, imExFilter, statusFilter, dateRange]);

  const statusColors: Record<string, string> = {
    Draft: 'default',
    Pending: 'processing',
    Approved: 'success',
    Completed: 'green',
    Cancelled: 'red',
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_invoice', key: 'id', width: 70 },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 140 },
    { title: '수출입', dataIndex: 'im_ex', key: 'im_ex', width: 80,
      render: (v: string) => v ? (
        <Tag color={v === 'IM' ? 'blue' : 'orange'}>{v}</Tag>
      ) : null,
    },
    { title: '고객사', dataIndex: 'clients', key: 'clients', width: 200 },
    { title: '도착일', dataIndex: 'arrival_date', key: 'arrival', width: 110 },
    { title: 'BL', dataIndex: 'bl', key: 'bl', width: 140 },
    { title: 'MBL', dataIndex: 'mbl', key: 'mbl', width: 140 },
    { title: '운송', dataIndex: 'phuong_thuc_van_chuyen', key: 'transport', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: 'Debit 상태', dataIndex: 'debit_status', key: 'status', width: 100,
      render: (v: string) => v ? (
        <Tag color={statusColors[v] || 'default'}>{v}</Tag>
      ) : null,
    },
    { title: 'Forward', dataIndex: 'forward', key: 'forward', width: 100 },
    { title: 'Ops', dataIndex: 'operation', key: 'operation', width: 100 },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>거래 데이터</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="Invoice/BL/고객명/MBL 검색"
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
          <Col span={3}>
            <Select
              placeholder="수출입"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setImExFilter(v); setPage(1); }}
              options={[
                { value: 'IM', label: 'IM (수입)' },
                { value: 'EX', label: 'EX (수출)' },
              ]}
            />
          </Col>
          <Col span={4}>
            <Select
              placeholder="Debit 상태"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: 'Draft', label: 'Draft' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Approved', label: 'Approved' },
                { value: 'Completed', label: 'Completed' },
              ]}
            />
          </Col>
          <Col span={7}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={(dates) => {
                setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null);
                setPage(1);
              }}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id_invoice"
          loading={loading}
          size="small"
          scroll={{ x: 1300 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `총 ${t}건`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
        />
      </Card>
    </div>
  );
};

export default ShipmentsPage;

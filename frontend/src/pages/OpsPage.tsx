import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select,
  message, Card, Descriptions, Row, Col,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import type {
  MssqlSchemeOps, MssqlOpsDetail, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;

/** Ops 비용 항목 라벨 */
const OPS_COST_LABELS: Record<string, string> = {
  customs_clearance_fee: '통관 수수료',
  inspection: '검사비',
  le_phi_tk: '신고서 인지세',
  thue_nhap_khau: '수입 관세',
  phi_tach_bill: 'B/L 분할비',
  phu_cap_cho_ops: 'Ops 수당',
  phi_luu_cont: '컨테이너 보관료',
  phi_luu_kho: '창고 보관료',
  phi_lam_hang: '하역비',
  phi_co_a_thai: 'A형 CO (태국)',
  phi_co_c_thao: 'C형 CO (해체)',
};

const OpsPage: React.FC = () => {
  const [data, setData] = useState<MssqlSchemeOps[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [costDetail, setCostDetail] = useState<MssqlOpsDetail | null>(null);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costLoading, setCostLoading] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MssqlSchemeOps | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await api.get<PaginatedResponse<MssqlSchemeOps>>(
        '/api/v1/mssql/ops', { params }
      );
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Ops 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, typeFilter]);

  const showCostDetail = async (record: MssqlSchemeOps) => {
    if (!record.id_ops) {
      message.warning('비용 정보가 연결되지 않았습니다');
      return;
    }
    setSelectedScheme(record);
    setCostLoading(true);
    setCostModalOpen(true);
    try {
      const res = await api.get<MssqlOpsDetail>(
        `/api/v1/mssql/ops/${record.id_scheme_ops}/costs`
      );
      setCostDetail(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Ops 비용 조회 실패');
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_scheme_ops', key: 'id', width: 70 },
    { title: '건명', dataIndex: 'name', key: 'name', width: 200 },
    { title: '유형', dataIndex: 'type', key: 'type', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: '고객사', dataIndex: 'customer', key: 'customer', width: 200 },
    { title: 'Invoice', dataIndex: 'so_invoice', key: 'invoice', width: 140 },
    { title: 'HBL', dataIndex: 'hbl', key: 'hbl', width: 140 },
    { title: 'MBL', dataIndex: 'mbl', key: 'mbl', width: 140 },
    { title: '판정', dataIndex: 'phan_luong', key: 'phan_luong', width: 80 },
    { title: '비용', key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeOps) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_ops ? '상세' : '-'}
        </a>
      ),
    },
  ];

  const renderCostItems = () => {
    if (!costDetail) return null;
    const items: { label: string; value: number | string }[] = [];

    for (const [key, label] of Object.entries(OPS_COST_LABELS)) {
      const val = (costDetail as any)[key];
      if (val && val > 0) {
        items.push({ label, value: val });
      }
    }
    // 영수증 번호 등 문자열 필드
    if (costDetail.bien_lai) items.push({ label: '영수증', value: costDetail.bien_lai });
    if (costDetail.cang_ha) items.push({ label: '하역 항구', value: costDetail.cang_ha });
    if (costDetail.note) items.push({ label: '비고', value: costDetail.note });

    if (items.length === 0) {
      return <p>등록된 비용 항목이 없습니다.</p>;
    }
    return (
      <Descriptions bordered size="small" column={2}>
        {items.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {typeof item.value === 'number'
              ? `${item.value.toLocaleString()} VND`
              : item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>Ops 운영 관리</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="건명/고객사/HBL 검색"
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
              placeholder="유형"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[
                { value: 'IM', label: 'IM (수입)' },
                { value: 'EX', label: 'EX (수출)' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id_scheme_ops"
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
        title={`Ops 비용 상세${selectedScheme?.name ? ` — ${selectedScheme.name}` : ''}`}
        open={costModalOpen}
        onCancel={() => { setCostModalOpen(false); setCostDetail(null); setSelectedScheme(null); }}
        footer={null}
        width={700}
        loading={costLoading}
      >
        {costDetail && renderCostItems()}
      </Modal>
    </div>
  );
};

export default OpsPage;

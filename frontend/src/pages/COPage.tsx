import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select,
  message, Card, Descriptions, Row, Col, Divider,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import type {
  MssqlSchemeCo, MssqlCoWithContract, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;

const COPage: React.FC = () => {
  const [data, setData] = useState<MssqlSchemeCo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string | undefined>();
  const [costDetail, setCostDetail] = useState<MssqlCoWithContract | null>(null);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costLoading, setCostLoading] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<MssqlSchemeCo | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (formFilter) params.form = formFilter;

      const res = await api.get<PaginatedResponse<MssqlSchemeCo>>(
        '/api/v1/mssql/co', { params }
      );
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'CO 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, formFilter]);

  const showCostDetail = async (record: MssqlSchemeCo) => {
    if (!record.id_co) {
      message.warning('비용 정보가 연결되지 않았습니다');
      return;
    }
    setSelectedScheme(record);
    setCostLoading(true);
    setCostModalOpen(true);
    try {
      const res = await api.get<MssqlCoWithContract>(
        `/api/v1/mssql/co/${record.id_scheme_co}/costs`
      );
      setCostDetail(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'CO 비용 조회 실패');
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_scheme_co', key: 'id', width: 100 },
    { title: 'CO Form', dataIndex: 'form', key: 'form', width: 80,
      render: (v: string) => v ? <Tag color="purple">{v}</Tag> : null,
    },
    { title: 'CO No.', dataIndex: 'so_co', key: 'so_co', width: 120 },
    { title: '발급일', dataIndex: 'ngay_cap', key: 'ngay_cap', width: 110 },
    { title: '고객사', dataIndex: 'ten_kh', key: 'ten_kh', width: 200 },
    { title: 'Invoice', dataIndex: 'so_invoice', key: 'invoice', width: 140 },
    { title: '통관번호', dataIndex: 'so_to_khai', key: 'so_to_khai', width: 130 },
    { title: '비고', dataIndex: 'note', key: 'note', width: 150, ellipsis: true },
    { title: '비용', key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeCo) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_co ? '상세' : '-'}
        </a>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>CO 원산지 증명 관리</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder="CO번호/Invoice/고객명 검색"
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
              placeholder="CO Form"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setFormFilter(v); setPage(1); }}
              options={[
                { value: 'AK', label: 'AK' },
                { value: 'D', label: 'D' },
                { value: 'E', label: 'E' },
                { value: 'AI', label: 'AI' },
                { value: 'AANZ', label: 'AANZ' },
                { value: 'VJ', label: 'VJ' },
                { value: 'VC', label: 'VC' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      <Card size="small">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id_scheme_co"
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
        title={`CO 비용 상세${selectedScheme?.so_co ? ` — ${selectedScheme.so_co}` : ''}`}
        open={costModalOpen}
        onCancel={() => { setCostModalOpen(false); setCostDetail(null); setSelectedScheme(null); }}
        footer={null}
        width={600}
        loading={costLoading}
      >
        {costDetail && (
          <>
            <Descriptions bordered size="small" column={2}>
              {costDetail.le_phi_co != null && costDetail.le_phi_co > 0 && (
                <Descriptions.Item label="CO 인지세">
                  {costDetail.le_phi_co.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.le_phi_bo_cong_thuong != null && costDetail.le_phi_bo_cong_thuong > 0 && (
                <Descriptions.Item label="산업통상부 인지세">
                  {costDetail.le_phi_bo_cong_thuong.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.phi_cap_moi_cap_lai && (
                <Descriptions.Item label="재발급/신규 발급비">
                  {costDetail.phi_cap_moi_cap_lai}
                </Descriptions.Item>
              )}
              {costDetail.phi_dv_sua_doi != null && costDetail.phi_dv_sua_doi > 0 && (
                <Descriptions.Item label="수정 서비스비">
                  {costDetail.phi_dv_sua_doi.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.trang_thai && (
                <Descriptions.Item label="상태">
                  <Tag>{costDetail.trang_thai}</Tag>
                </Descriptions.Item>
              )}
              {costDetail.note && (
                <Descriptions.Item label="비고" span={2}>
                  {costDetail.note}
                </Descriptions.Item>
              )}
            </Descriptions>

            {costDetail.contract && (
              <>
                <Divider>계약 정보</Divider>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label="고객명">
                    {costDetail.contract.ten_khach}
                  </Descriptions.Item>
                  <Descriptions.Item label="CO 수수료">
                    {costDetail.contract.co_fee}
                  </Descriptions.Item>
                  <Descriptions.Item label="계약 금액">
                    {costDetail.contract.amount?.toLocaleString()} VND
                  </Descriptions.Item>
                </Descriptions>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};

export default COPage;

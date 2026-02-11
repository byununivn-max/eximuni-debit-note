import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select, DatePicker,
  message, Card, Descriptions, Row, Col,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import type {
  MssqlSchemeClearance, MssqlClearanceDetail, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;
const { RangePicker } = DatePicker;

/** 비용 항목 라벨 매핑 (베트남어 컬럼명 -> 한국어) */
const COST_LABELS: Record<string, string> = {
  phi_thong_quan: '통관 수수료',
  phi_mo_tk_ngoai_gio: '시간외 개장 수수료',
  phi_sua_tk: '신고서 수정 수수료',
  phi_huy_tk: '신고서 취소 수수료',
  phi_kiem_hoa: '검사 수수료',
  phi_khai_hoa_chat: '화학물 신고 수수료',
  phi_gp_nk_tien_chat: '전구물질 허가 수수료',
  phi_khac_inland: '기타 내륙 수수료',
  phi_van_chuyen: '운송비',
  phi_giao_hang_nhanh: '특급 배송비',
  phi_luu_cont: '컨테이너 보관료',
  phi_do_cont_tuyen_dai: '장거리 컨테이너비',
  phi_nang: 'Lift On',
  phi_ha: 'Lift Off',
  phi_luu_kho: '창고 보관료',
  phi_nhan_cong: '인건비',
  phi_chung_tu: '서류 수수료',
  phi_do_hang: '하역비',
  of_af: 'OF/AF',
  phi_giao_tai_xuong: '공장 배송비',
  phi_giao_tai_diem_chi_dinh: '지정지 배송비',
  phi_xu_ly_hang_hoa: '화물 처리비',
  phu_phi_xang_dau: '유류 할증료',
  phu_phi_an_ninh: '보안 할증료',
  phi_soi_chieu: 'X-ray 검사비',
  phi_bao_hiem_hang_hoa: '화물 보험료',
  phi_tach_bill: 'B/L 분할 수수료',
  phi_khac_local: '기타 Local',
  phi_nang_pay_on: 'Lift On (Pay-on)',
  phi_ha_payon: 'Lift Off (Pay-on)',
  phi_local: 'Local Charges',
  phi_khac_chi_ho: '기타 대납 수수료',
};

const ClearancePage: React.FC = () => {
  const [data, setData] = useState<MssqlSchemeClearance[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [imExFilter, setImExFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [costDetail, setCostDetail] = useState<MssqlClearanceDetail | null>(null);
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costLoading, setCostLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };
      if (search) params.company = search;
      if (imExFilter) params.im_ex = imExFilter;
      if (dateRange) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }

      const res = await api.get<PaginatedResponse<MssqlSchemeClearance>>(
        '/api/v1/mssql/clearance', { params }
      );
      setData(res.data.items);
      setTotal(res.data.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '통관 목록 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, imExFilter, dateRange]);

  const showCostDetail = async (record: MssqlSchemeClearance) => {
    if (!record.id_clearance) {
      message.warning('비용 정보가 연결되지 않았습니다');
      return;
    }
    setCostLoading(true);
    setCostModalOpen(true);
    try {
      const res = await api.get<MssqlClearanceDetail>(
        `/api/v1/mssql/clearance/${record.id_scheme_cd}/costs`
      );
      setCostDetail(res.data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '비용 상세 조회 실패');
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_scheme_cd', key: 'id', width: 70 },
    { title: 'Invoice', dataIndex: 'invoice', key: 'invoice', width: 140 },
    { title: '수출입', dataIndex: 'im_ex', key: 'im_ex', width: 80,
      render: (v: string) => v ? (
        <Tag color={v === 'IM' ? 'blue' : 'orange'}>{v}</Tag>
      ) : null,
    },
    { title: '고객사', dataIndex: 'company', key: 'company', width: 200 },
    { title: '도착일', dataIndex: 'arrival_date', key: 'arrival', width: 110 },
    { title: 'HBL', dataIndex: 'hbl', key: 'hbl', width: 140 },
    { title: '선박', dataIndex: 'vessel', key: 'vessel', width: 140 },
    { title: '판정', dataIndex: 'phan_luong', key: 'phan_luong', width: 80 },
    { title: '통관번호', dataIndex: 'so_tk', key: 'so_tk', width: 130 },
    { title: '비용', key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeClearance) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_clearance ? '상세' : '-'}
        </a>
      ),
    },
  ];

  /** 비용 0 이상인 항목만 필터링하여 표시 */
  const renderCostItems = () => {
    if (!costDetail) return null;
    const items: { label: string; value: number }[] = [];
    for (const [key, label] of Object.entries(COST_LABELS)) {
      const val = (costDetail as any)[key];
      if (val && val > 0) {
        items.push({ label, value: val });
      }
    }
    if (items.length === 0) {
      return <p>등록된 비용 항목이 없습니다.</p>;
    }
    return (
      <Descriptions bordered size="small" column={2}>
        {items.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {item.value.toLocaleString()} VND
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>CD 통관 관리</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder="고객사 검색"
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
          <Col span={8}>
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
          rowKey="id_scheme_cd"
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
        title="통관 비용 상세"
        open={costModalOpen}
        onCancel={() => { setCostModalOpen(false); setCostDetail(null); }}
        footer={null}
        width={700}
        loading={costLoading}
      >
        {costDetail && (
          <>
            <p style={{ marginBottom: 12, color: '#888' }}>
              Clearance ID: {costDetail.id_clearance}
              {costDetail.ghi_chu && ` | 비고: ${costDetail.ghi_chu}`}
            </p>
            {renderCostItems()}
          </>
        )}
      </Modal>
    </div>
  );
};

export default ClearancePage;

import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select, DatePicker,
  message, Card, Descriptions, Row, Col,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type {
  MssqlSchemeClearance, MssqlClearanceDetail, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;
const { RangePicker } = DatePicker;

/** 비용 항목 키 목록 (베트남어 컬럼명 → i18n 키) */
const COST_LABEL_KEYS = [
  'phi_thong_quan', 'phi_mo_tk_ngoai_gio', 'phi_sua_tk', 'phi_huy_tk',
  'phi_kiem_hoa', 'phi_khai_hoa_chat', 'phi_gp_nk_tien_chat', 'phi_khac_inland',
  'phi_van_chuyen', 'phi_giao_hang_nhanh', 'phi_luu_cont', 'phi_do_cont_tuyen_dai',
  'phi_nang', 'phi_ha', 'phi_luu_kho', 'phi_nhan_cong', 'phi_chung_tu', 'phi_do_hang',
  'of_af', 'phi_giao_tai_xuong', 'phi_giao_tai_diem_chi_dinh', 'phi_xu_ly_hang_hoa',
  'phu_phi_xang_dau', 'phu_phi_an_ninh', 'phi_soi_chieu', 'phi_bao_hiem_hang_hoa',
  'phi_tach_bill', 'phi_khac_local', 'phi_nang_pay_on', 'phi_ha_payon',
  'phi_local', 'phi_khac_chi_ho',
] as const;

const ClearancePage: React.FC = () => {
  const { t } = useTranslation(['operations', 'common']);
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
      message.error(err.response?.data?.detail || t('operations:clearance.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, imExFilter, dateRange]);

  const showCostDetail = async (record: MssqlSchemeClearance) => {
    if (!record.id_clearance) {
      message.warning(t('common:message.noCostInfo'));
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
      message.error(err.response?.data?.detail || t('operations:clearance.costFetchFailed'));
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: t('operations:clearance.columnId'), dataIndex: 'id_scheme_cd', key: 'id', width: 70 },
    { title: t('operations:clearance.columnInvoice'), dataIndex: 'invoice', key: 'invoice', width: 140 },
    { title: t('operations:clearance.columnImEx'), dataIndex: 'im_ex', key: 'im_ex', width: 80,
      render: (v: string) => v ? (
        <Tag color={v === 'IM' ? 'blue' : 'orange'}>{v}</Tag>
      ) : null,
    },
    { title: t('operations:clearance.columnClient'), dataIndex: 'company', key: 'company', width: 200 },
    { title: t('operations:clearance.columnArrival'), dataIndex: 'arrival_date', key: 'arrival', width: 110 },
    { title: t('operations:clearance.columnHbl'), dataIndex: 'hbl', key: 'hbl', width: 140 },
    { title: t('operations:clearance.columnVessel'), dataIndex: 'vessel', key: 'vessel', width: 140 },
    { title: t('operations:clearance.columnJudgment'), dataIndex: 'phan_luong', key: 'phan_luong', width: 80 },
    { title: t('operations:clearance.columnCustomsNo'), dataIndex: 'so_tk', key: 'so_tk', width: 130 },
    { title: t('operations:clearance.columnCost'), key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeClearance) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_clearance ? t('operations:clearance.costDetail') : '-'}
        </a>
      ),
    },
  ];

  /** 비용 0 이상인 항목만 필터링하여 표시 */
  const renderCostItems = () => {
    if (!costDetail) return null;
    const items: { label: string; value: number }[] = [];
    for (const key of COST_LABEL_KEYS) {
      const val = (costDetail as any)[key];
      if (val && val > 0) {
        items.push({ label: t(`operations:clearance.costLabels.${key}`), value: val });
      }
    }
    if (items.length === 0) {
      return <p>{t('common:message.noCostItems')}</p>;
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
      <Title level={4} style={{ marginBottom: 16 }}>{t('operations:clearance.title')}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Input
              placeholder={t('operations:clearance.searchPlaceholder')}
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
              placeholder={t('operations:clearance.columnImEx')}
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setImExFilter(v); setPage(1); }}
              options={[
                { value: 'IM', label: t('common:imEx.import') },
                { value: 'EX', label: t('common:imEx.export') },
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
        title={t('operations:clearance.costDetailTitle')}
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
              {costDetail.ghi_chu && ` | ${t('operations:clearance.remark')}: ${costDetail.ghi_chu}`}
            </p>
            {renderCostItems()}
          </>
        )}
      </Modal>
    </div>
  );
};

export default ClearancePage;

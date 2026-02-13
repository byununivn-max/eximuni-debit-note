import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select,
  message, Card, Descriptions, Row, Col,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type {
  MssqlSchemeOps, MssqlOpsDetail, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;

/** Ops 비용 항목 키 목록 */
const OPS_COST_LABEL_KEYS = [
  'customs_clearance_fee', 'inspection', 'le_phi_tk', 'thue_nhap_khau',
  'phi_tach_bill', 'phu_cap_cho_ops', 'phi_luu_cont', 'phi_luu_kho',
  'phi_lam_hang', 'phi_co_a_thai', 'phi_co_c_thao',
] as const;

const OpsPage: React.FC = () => {
  const { t } = useTranslation(['operations', 'common']);
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
      message.error(err.response?.data?.detail || t('operations:ops.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, typeFilter]);

  const showCostDetail = async (record: MssqlSchemeOps) => {
    if (!record.id_ops) {
      message.warning(t('common:message.noCostInfo'));
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
      message.error(err.response?.data?.detail || t('operations:ops.costFetchFailed'));
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: t('operations:ops.columnId'), dataIndex: 'id_scheme_ops', key: 'id', width: 70 },
    { title: t('operations:ops.columnName'), dataIndex: 'name', key: 'name', width: 200 },
    { title: t('operations:ops.columnType'), dataIndex: 'type', key: 'type', width: 80,
      render: (v: string) => v ? <Tag>{v}</Tag> : null,
    },
    { title: t('operations:ops.columnClient'), dataIndex: 'customer', key: 'customer', width: 200 },
    { title: t('operations:ops.columnInvoice'), dataIndex: 'so_invoice', key: 'invoice', width: 140 },
    { title: t('operations:ops.columnHbl'), dataIndex: 'hbl', key: 'hbl', width: 140 },
    { title: t('operations:ops.columnMbl'), dataIndex: 'mbl', key: 'mbl', width: 140 },
    { title: t('operations:ops.columnJudgment'), dataIndex: 'phan_luong', key: 'phan_luong', width: 80 },
    { title: t('operations:ops.columnCost'), key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeOps) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_ops ? t('common:button.detail') : '-'}
        </a>
      ),
    },
  ];

  const renderCostItems = () => {
    if (!costDetail) return null;
    const items: { label: string; value: number | string }[] = [];

    for (const key of OPS_COST_LABEL_KEYS) {
      const val = (costDetail as any)[key];
      if (val && val > 0) {
        items.push({ label: t(`operations:ops.costLabels.${key}`), value: val });
      }
    }
    // 영수증 번호 등 문자열 필드
    if (costDetail.bien_lai) items.push({ label: t('operations:ops.receipt'), value: costDetail.bien_lai });
    if (costDetail.cang_ha) items.push({ label: t('operations:ops.port'), value: costDetail.cang_ha });
    if (costDetail.note) items.push({ label: t('operations:ops.note'), value: costDetail.note });

    if (items.length === 0) {
      return <p>{t('common:message.noCostItems')}</p>;
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
      <Title level={4} style={{ marginBottom: 16 }}>{t('operations:ops.title')}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder={t('operations:ops.searchPlaceholder')}
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
              placeholder={t('operations:ops.typeFilter')}
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setTypeFilter(v); setPage(1); }}
              options={[
                { value: 'IM', label: t('common:imEx.import') },
                { value: 'EX', label: t('common:imEx.export') },
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
        title={`${t('operations:ops.costDetailTitle')}${selectedScheme?.name ? ` — ${selectedScheme.name}` : ''}`}
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

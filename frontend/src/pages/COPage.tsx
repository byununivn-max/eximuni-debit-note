import React, { useEffect, useState } from 'react';
import {
  Table, Space, Typography, Tag, Modal, Input, Select,
  message, Card, Descriptions, Row, Col, Divider,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type {
  MssqlSchemeCo, MssqlCoWithContract, PaginatedResponse,
} from '../types/mssql';

const { Title } = Typography;

const COPage: React.FC = () => {
  const { t } = useTranslation(['operations', 'common']);
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
      message.error(err.response?.data?.detail || t('operations:co.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, search, formFilter]);

  const showCostDetail = async (record: MssqlSchemeCo) => {
    if (!record.id_co) {
      message.warning(t('common:message.noCostInfo'));
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
      message.error(err.response?.data?.detail || t('operations:co.costFetchFailed'));
      setCostModalOpen(false);
    } finally {
      setCostLoading(false);
    }
  };

  const columns = [
    { title: t('operations:co.columnId'), dataIndex: 'id_scheme_co', key: 'id', width: 100 },
    { title: t('operations:co.columnForm'), dataIndex: 'form', key: 'form', width: 80,
      render: (v: string) => v ? <Tag color="purple">{v}</Tag> : null,
    },
    { title: t('operations:co.columnNo'), dataIndex: 'so_co', key: 'so_co', width: 120 },
    { title: t('operations:co.columnIssueDate'), dataIndex: 'ngay_cap', key: 'ngay_cap', width: 110 },
    { title: t('operations:co.columnClient'), dataIndex: 'ten_kh', key: 'ten_kh', width: 200 },
    { title: t('operations:co.columnInvoice'), dataIndex: 'so_invoice', key: 'invoice', width: 140 },
    { title: t('operations:co.columnCustomsNo'), dataIndex: 'so_to_khai', key: 'so_to_khai', width: 130 },
    { title: t('operations:co.columnNote'), dataIndex: 'note', key: 'note', width: 150, ellipsis: true },
    { title: t('operations:co.columnCost'), key: 'costs', width: 80,
      render: (_: any, r: MssqlSchemeCo) => (
        <a onClick={() => showCostDetail(r)}>
          {r.id_co ? t('common:button.detail') : '-'}
        </a>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>{t('operations:co.title')}</Title>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Input
              placeholder={t('operations:co.searchPlaceholder')}
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
              placeholder={t('operations:co.formFilter')}
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
        title={`${t('operations:co.costDetailTitle')}${selectedScheme?.so_co ? ` — ${selectedScheme.so_co}` : ''}`}
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
                <Descriptions.Item label={t('operations:co.coStampDuty')}>
                  {costDetail.le_phi_co.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.le_phi_bo_cong_thuong != null && costDetail.le_phi_bo_cong_thuong > 0 && (
                <Descriptions.Item label={t('operations:co.moitStampDuty')}>
                  {costDetail.le_phi_bo_cong_thuong.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.phi_cap_moi_cap_lai && (
                <Descriptions.Item label={t('operations:co.reissue')}>
                  {costDetail.phi_cap_moi_cap_lai}
                </Descriptions.Item>
              )}
              {costDetail.phi_dv_sua_doi != null && costDetail.phi_dv_sua_doi > 0 && (
                <Descriptions.Item label={t('operations:co.modificationFee')}>
                  {costDetail.phi_dv_sua_doi.toLocaleString()} VND
                </Descriptions.Item>
              )}
              {costDetail.trang_thai && (
                <Descriptions.Item label={t('operations:co.status')}>
                  <Tag>{costDetail.trang_thai}</Tag>
                </Descriptions.Item>
              )}
              {costDetail.note && (
                <Descriptions.Item label={t('operations:co.columnNote')} span={2}>
                  {costDetail.note}
                </Descriptions.Item>
              )}
            </Descriptions>

            {costDetail.contract && (
              <>
                <Divider>{t('operations:co.contractInfo')}</Divider>
                <Descriptions bordered size="small" column={2}>
                  <Descriptions.Item label={t('operations:co.contractCustomer')}>
                    {costDetail.contract.ten_khach}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('operations:co.contractCoFee')}>
                    {costDetail.contract.co_fee}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('operations:co.contractAmount')}>
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

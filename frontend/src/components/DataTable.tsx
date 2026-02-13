import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Card, Row, Col } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';

interface DataTableProps<T> {
  /** 데이터 목록 조회 함수 — { items, total } 반환 */
  fetchData: (params: {
    page: number;
    pageSize: number;
    search: string;
  }) => Promise<{ items: T[]; total: number }>;
  /** Ant Design Table 컬럼 정의 */
  columns: ColumnsType<T>;
  /** 각 행의 고유 키 필드명 */
  rowKey: string;
  /** 검색 placeholder 텍스트 */
  searchPlaceholder?: string;
  /** 기본 페이지 크기 */
  defaultPageSize?: number;
  /** 검색 바 오른쪽에 추가할 필터 영역 */
  extraFilters?: React.ReactNode;
  /** 외부 의존성 변경 시 재조회 트리거 */
  deps?: React.DependencyList;
  /** 테이블 스크롤 너비 */
  scrollX?: number;
}

/** 검색 + 테이블 + 페이지네이션 통합 컴포넌트 */
const DataTable = <T extends Record<string, any>>({
  fetchData,
  columns,
  rowKey,
  searchPlaceholder = '검색...',
  defaultPageSize = 20,
  extraFilters,
  deps = [],
  scrollX,
}: DataTableProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchData({ page, pageSize, search });
      setData(result.items);
      setTotal(result.total);
    } catch {
      /* useApi 또는 서비스에서 에러 처리 */
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, search, ...deps]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    if (pagination.current) setPage(pagination.current);
    if (pagination.pageSize) setPageSize(pagination.pageSize);
  };

  return (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={extraFilters ? 8 : 12}>
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              allowClear
              onPressEnter={(e) =>
                handleSearch((e.target as HTMLInputElement).value)
              }
              onChange={(e) => {
                if (!e.target.value) handleSearch('');
              }}
            />
          </Col>
          {extraFilters && <Col span={16}>{extraFilters}</Col>}
        </Row>
      </Card>

      <Card size="small">
        <Table<T>
          columns={columns}
          dataSource={data}
          rowKey={rowKey}
          loading={loading}
          size="small"
          scroll={scrollX ? { x: scrollX } : undefined}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `총 ${t}건`,
          }}
          onChange={handleTableChange}
        />
      </Card>
    </>
  );
};

export default DataTable;

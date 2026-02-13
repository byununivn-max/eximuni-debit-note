import api from './api';
import type { MssqlClient, MssqlClientDetail, PaginatedResponse } from '../types/mssql';

export interface ClientListParams {
  skip: number;
  limit: number;
  active_only?: boolean;
  search?: string;
}

/** MSSQL 거래처(Client) API 서비스 */
export const clientService = {
  /** 거래처 목록 조회 (페이지네이션) */
  getList: (params: ClientListParams): Promise<PaginatedResponse<MssqlClient>> =>
    api.get('/api/v1/mssql/clients', { params }).then(r => r.data),

  /** 거래처 상세 조회 */
  getDetail: (clientId: number): Promise<MssqlClientDetail> =>
    api.get(`/api/v1/mssql/clients/${clientId}`).then(r => r.data),
};

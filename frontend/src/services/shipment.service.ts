import api from './api';
import type { MssqlDebitSharepoint, PaginatedResponse } from '../types/mssql';

export interface ShipmentListParams {
  skip: number;
  limit: number;
  search?: string;
  im_ex?: string;
  debit_status?: string;
  date_from?: string;
  date_to?: string;
}

/** 선적(Debit Sharepoint) API 서비스 */
export const shipmentService = {
  /** 선적 목록 조회 (페이지네이션) */
  getList: (params: ShipmentListParams): Promise<PaginatedResponse<MssqlDebitSharepoint>> =>
    api.get('/api/v1/mssql/debit-sharepoint', { params }).then(r => r.data),
};

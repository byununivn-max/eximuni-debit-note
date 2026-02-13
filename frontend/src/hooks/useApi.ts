import { useState, useEffect, useCallback, useRef, DependencyList } from 'react';
import { message } from 'antd';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** 수동 실행 API 훅 (POST/PUT/DELETE 등) */
export function useApi<T, P = void>(
  apiFn: (params: P) => Promise<T>,
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null, loading: false, error: null,
  });

  const execute = useCallback(async (params: P) => {
    setState({ data: null, loading: true, error: null });
    try {
      const data = await apiFn(params);
      setState({ data, loading: false, error: null });
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Request failed';
      setState({ data: null, loading: false, error: msg });
      message.error(msg);
      throw err;
    }
  }, [apiFn]);

  return { ...state, execute };
}

/** 자동 실행 API 훅 (GET 목록 조회) */
export function useApiFetch<T>(
  apiFn: () => Promise<T>,
  deps: DependencyList = [],
) {
  const [state, setState] = useState<ApiState<T>>({
    data: null, loading: true, error: null,
  });
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiFn();
      if (mountedRef.current) {
        setState({ data, loading: false, error: null });
      }
    } catch (err: any) {
      if (mountedRef.current) {
        const msg = err.response?.data?.detail
          || err.message
          || 'Failed to fetch data';
        setState({ data: null, loading: false, error: msg });
        message.error(msg);
      }
    }
  }, [apiFn]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => { mountedRef.current = false; };
  }, deps);

  return { ...state, refresh };
}

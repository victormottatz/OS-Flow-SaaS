import { useState, useEffect, useRef, useCallback } from 'react';
import { OrdemServico, OSStatus } from '../types';

interface PaginatedResponse {
  data: OrdemServico[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
  totalPages: number;
  countsByStatus?: Record<string, number>;
}

export interface UseOSListOptions {
  page: number;
  pageSize: number;
  search?: string;
  status?: OSStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UseOSListReturn {
  data: OrdemServico[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalPages: number;
  loading: boolean;
  error: string | null;
  countsByStatus: Record<string, number>;
  refetch: () => void;
}

export function useOSList(options: UseOSListOptions): UseOSListReturn {
  const [state, setState] = useState<{
    data: OrdemServico[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
    totalPages: number;
    loading: boolean;
    error: string | null;
    countsByStatus: Record<string, number>;
  }>({
    data: [],
    total: 0,
    page: options.page,
    pageSize: options.pageSize,
    hasMore: false,
    totalPages: 0,
    loading: true,
    error: null,
    countsByStatus: {},
  });

  const abortRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async (opts: UseOSListOptions) => {
    const id = ++fetchIdRef.current;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const token = localStorage.getItem('mgv_token') || '';
      const params = new URLSearchParams();
      params.set('page', String(opts.page));
      params.set('pageSize', String(opts.pageSize));
      if (opts.search) params.set('search', opts.search);
      if (opts.status) params.set('status', opts.status);
      if (opts.sortBy) params.set('sortBy', opts.sortBy);
      if (opts.sortOrder) params.set('sortOrder', opts.sortOrder);
      params.set('includeRelations', 'true');

      const res = await fetch(`/api/ordens-servico?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Erro HTTP ${res.status}`);
      if (id !== fetchIdRef.current) return;

      const json: PaginatedResponse = await res.json();

      setState({
        data: json.data,
        total: json.total,
        page: json.page,
        pageSize: json.pageSize,
        hasMore: json.hasMore,
        totalPages: json.totalPages,
        loading: false,
        error: null,
        countsByStatus: json.countsByStatus || {},
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (id !== fetchIdRef.current) return;
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, []);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(options.search ?? '');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(options.search ?? ''), 300);
    return () => clearTimeout(timer);
  }, [options.search]);

  const fetchKey = JSON.stringify({
    page: options.page,
    pageSize: options.pageSize,
    search: debouncedSearch || undefined,
    status: options.status,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
  });

  useEffect(() => {
    const parsed = JSON.parse(fetchKey);
    fetchData(parsed);
  }, [fetchKey, fetchData]);

  const refetch = useCallback(() => {
    const parsed = JSON.parse(fetchKey);
    fetchData(parsed);
  }, [fetchKey, fetchData]);

  return { ...state, refetch };
}

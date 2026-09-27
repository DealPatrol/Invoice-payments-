'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats, Invoice } from './types';

export function useInvoices(filters?: { status?: string; search?: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setInvoices(data.invoices);
      setMode(data.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [filters?.status, filters?.search]);

  useEffect(() => {
    load();
  }, [load]);

  return { invoices, mode, loading, error, reload: load };
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setMode(data.mode);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { stats, mode, loading };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DashboardStats, Invoice } from './types';

async function fetchInvoices(status?: string, search?: string) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const response = await fetch(`/api/invoices?${params}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to load');
  return data as { invoices: Invoice[]; mode: 'demo' | 'postgres' };
}

export function useInvoices(filters?: { status?: string; search?: string }) {
  const status = filters?.status;
  const search = filters?.search;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [mode, setMode] = useState<'demo' | 'postgres'>('demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchInvoices(status, search)
      .then((data) => {
        if (!active) return;
        setInvoices(data.invoices);
        setMode(data.mode);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [status, search]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices(status, search);
      setInvoices(data.invoices);
      setMode(data.mode);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [status, search]);

  return { invoices, mode, loading, error, reload };
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

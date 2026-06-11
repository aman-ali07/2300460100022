'use client';

import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types/notification';
import { fetchNotifications, FetchParams } from '@/utils/api';
import { Log } from '@/utils/logger';

interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useNotifications(params: FetchParams = {}): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // serialize params to avoid unnecessary re-fetches
  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedNotifications = await fetchNotifications(params);
      setNotifications(fetchedNotifications);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      await Log('frontend', 'error', 'hook', `useNotifications: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { notifications, loading, error, refetch: load };
}

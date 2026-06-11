'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'viewed_notification_ids';

export function useViewedNotifications() {
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setViewedIds(new Set(JSON.parse(stored) as string[]));
    } catch {
      // ignore corrupted storage
    }
  }, []);

  function syncToStorage(ids: Set<string>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    } catch {
      // ignore storage errors
    }
  }

  function markViewed(id: string): void {
    setViewedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      syncToStorage(next);
      return next;
    });
  }

  function markAllViewed(ids: string[]): void {
    setViewedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      syncToStorage(next);
      return next;
    });
  }

  function isViewed(id: string): boolean {
    return viewedIds.has(id);
  }

  return { isViewed, markViewed, markAllViewed };
}

'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function DailyLoginTracker({ userId }: { userId: string }) {
  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc('record_daily_login', { p_user_id: userId })
      .then(() => {
        fetch('/api/check-badges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).catch(() => {});
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

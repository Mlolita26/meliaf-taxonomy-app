'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'available' | 'saving' | 'done' | 'cancelling';

export default function AgreeButton({ termId, termCode, userId }: { termId: string; termCode: string; userId: string }) {
  const [status, setStatus]       = useState<Status>('checking');
  const [showToast, setShowToast] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase
        .from('points_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('source_type', 'term_approved')
        .eq('source_id', termId),
      supabase
        .from('points_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reason', `Agreed with term: ${termCode}`),
    ]).then(([{ count: c1 }, { count: c2 }]) => {
      setStatus(((c1 ?? 0) > 0 || (c2 ?? 0) > 0) ? 'done' : 'available');
    });
  }, [userId, termId, termCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAgree() {
    if (status !== 'available') return;
    setStatus('saving');

    const { error } = await supabase.from('points_transactions').insert({
      user_id:     userId,
      points:      10,
      reason:      `Agreed with term: ${termCode}`,
      source_type: 'term_approved',
      source_id:   termId,
    });

    if (!error) {
      setShowToast(true);
      fetch('/api/check-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
      setTimeout(() => { setShowToast(false); setStatus('done'); }, 2200);
    } else {
      setStatus('available');
    }
  }

  async function handleCancelAgree() {
    if (status !== 'done') return;
    setStatus('cancelling');

    await fetch('/api/cancel-agree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, termId, termCode }),
    });

    setStatus('available');
  }

  return (
    <>
      {showToast && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-points-popup bg-green-600 text-white px-10 py-6 rounded-3xl shadow-2xl text-center">
            <div className="text-4xl font-black">+10 pts</div>
            <div className="text-3xl mt-1">🎉</div>
          </div>
        </div>
      )}

      {status === 'checking' && (
        <div className="w-full py-2.5 text-center bg-gray-50 text-gray-400 rounded-xl text-sm border border-gray-100 animate-pulse">
          Loading…
        </div>
      )}
      {status === 'available' && (
        <button
          onClick={handleAgree}
          className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-sm"
        >
          I agree with this term · +10 pts
        </button>
      )}
      {(status === 'saving' || status === 'cancelling') && (
        <div className="w-full py-2.5 text-center bg-gray-50 text-gray-400 rounded-xl text-sm border border-gray-100 animate-pulse">
          {status === 'saving' ? 'Saving…' : 'Cancelling…'}
        </div>
      )}
      {status === 'done' && (
        <button
          onClick={handleCancelAgree}
          className="group relative w-full py-2.5 text-center bg-green-50 text-green-700 font-medium rounded-xl text-sm border border-green-100 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all"
        >
          <span className="group-hover:hidden">✓ Agreed · +10 pts</span>
          <span className="hidden group-hover:inline">↩ Cancel agreement · −10 pts</span>
        </button>
      )}
    </>
  );
}

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AgreeButton({ termId, termCode, userId }: { termId: string; termCode: string; userId: string }) {
  const [done, setDone]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [showToast, setShowToast] = useState(false);
  const supabase = createClient();

  async function handleAgree() {
    setLoading(true);

    const [{ error: txError }] = await Promise.all([
      supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      10,
        reason:      `Agreed with term: ${termCode}`,
        source_type: 'term_approved',
      }),
      // Also increment profile directly so the profile page shows updated points
      // even if the DB trigger is delayed
      supabase.from('profiles').select('total_points').eq('id', userId).single()
        .then(({ data }) =>
          supabase.from('profiles')
            .update({ total_points: (data?.total_points ?? 0) + 10 })
            .eq('id', userId)
        ),
    ]);

    if (!txError) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setDone(true);
      }, 1400);
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="w-full py-2.5 text-center bg-gray-50 text-green-700 font-medium rounded-xl text-sm border border-green-100">
        ✓ Agreed · +10 pts
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Floating +10 pts toast */}
      {showToast && (
        <div
          className="absolute inset-x-0 -top-8 flex justify-center pointer-events-none"
          style={{ animation: 'floatUp 1.4s ease-out forwards' }}
        >
          <span className="bg-green-600 text-white text-sm font-bold px-3 py-1 rounded-full shadow-md">
            +10 pts 🎉
          </span>
        </div>
      )}

      <button
        onClick={handleAgree}
        disabled={loading || showToast}
        className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'I agree with this term  +10 pts'}
      </button>

      <style jsx>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 1; transform: translateY(-18px) scale(1.1); }
          100% { opacity: 0; transform: translateY(-32px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

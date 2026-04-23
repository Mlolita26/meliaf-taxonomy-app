'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

type Status = 'checking' | 'available' | 'saving' | 'done';

export default function AgreeButton({ termId, termCode, userId }: { termId: string; termCode: string; userId: string }) {
  const [status, setStatus]       = useState<Status>('checking');
  const [showToast, setShowToast] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('points_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('source_type', 'term_approved')
      .eq('source_id', termId)
      .then(({ count }) => setStatus((count ?? 0) > 0 ? 'done' : 'available'));
  }, [userId, termId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      // Bump profile total directly for instant visibility
      const { data: profile } = await supabase
        .from('profiles').select('total_points').eq('id', userId).single();
      await supabase.from('profiles')
        .update({ total_points: (profile?.total_points ?? 0) + 10 })
        .eq('id', userId);

      setShowToast(true);
      setTimeout(() => { setShowToast(false); setStatus('done'); }, 2200);
    } else {
      setStatus('available');
    }
  }

  return (
    <>
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 30 }}
            animate={{ opacity: 1, scale: 1,   y: 0  }}
            exit={{   opacity: 0, scale: 0.8,  y: -50 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-green-600 text-white px-10 py-6 rounded-3xl shadow-2xl text-center">
              <div className="text-4xl font-black">+10 pts</div>
              <div className="text-3xl mt-1">🎉</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      {status === 'saving' && (
        <div className="w-full py-2.5 text-center bg-gray-50 text-gray-400 rounded-xl text-sm border border-gray-100 animate-pulse">
          Saving…
        </div>
      )}
      {status === 'done' && (
        <div className="w-full py-2.5 text-center bg-green-50 text-green-700 font-medium rounded-xl text-sm border border-green-100">
          ✓ Agreed · +10 pts
        </div>
      )}
    </>
  );
}

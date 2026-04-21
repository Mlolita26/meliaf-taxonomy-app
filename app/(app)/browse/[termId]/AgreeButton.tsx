'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AgreeButton({ termId, termCode, userId }: { termId: string; termCode: string; userId: string }) {
  const [done, setDone]       = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleAgree() {
    setLoading(true);
    await supabase.from('points_transactions').insert({
      user_id:     userId,
      points:      10,
      reason:      `Agreed with term: ${termCode}`,
      source_type: 'term_approved',
    });
    setDone(true);
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
    <button
      onClick={handleAgree}
      disabled={loading}
      className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
    >
      {loading ? 'Saving…' : 'I agree with this term  +10 pts'}
    </button>
  );
}

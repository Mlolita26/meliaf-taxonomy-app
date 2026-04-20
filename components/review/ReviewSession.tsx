'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { AssignmentWithTerm } from '@/types/database';
import { ELEMENT_LABELS, ELEMENT_COLORS, TERM_FIELDS } from '@/constants/points';

interface Props {
  assignment: AssignmentWithTerm;
  userId: string;
  queueCount: number;
}

type Action = 'approve' | 'flag' | 'skip';

export function ReviewSession({ assignment, userId, queueCount }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const startRef = useRef(Date.now());

  const [submitted, setSubmitted] = useState(false);
  const [action, setAction]       = useState<Action | null>(null);
  const [pointsEarned, setPointsEarned] = useState(0);

  const term = assignment.taxonomy_terms;
  const elColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';

  const fields = TERM_FIELDS.map(f => ({
    ...f,
    value: (term as any)[f.key],
  })).filter(f => f.value);

  async function handleAction(act: Action) {
    if (submitted) return;
    setAction(act);

    const timeSpent = Math.round((Date.now() - startRef.current) / 1000);
    const newStatus = act === 'skip' ? 'skipped' : 'completed';
    const pts       = act === 'skip' ? 0 : act === 'approve' ? 10 : 10;

    await supabase
      .from('review_assignments')
      .update({
        status:       newStatus,
        completed_at: new Date().toISOString(),
        time_spent_s: timeSpent,
      })
      .eq('id', assignment.id);

    if (pts > 0) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      pts,
        reason:      act === 'approve' ? 'Review completed: approved' : 'Review completed: flagged',
        source_type: 'review_complete',
        source_id:   assignment.id,
      });
      setPointsEarned(pts);
    }

    // First-review bonus
    const { count } = await supabase
      .from('review_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('reviewer_id', userId)
      .eq('status', 'completed');

    if ((count ?? 0) === 1) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      15,
        reason:      'First review bonus!',
        source_type: 'first_review_bonus',
        source_id:   assignment.id,
      });
      setPointsEarned(pts + 15);
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="p-4 min-h-screen flex flex-col items-center justify-center space-y-6">
        <AnimatePresence>
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            <div className="text-6xl">
              {action === 'approve' ? '✅' : action === 'flag' ? '🚩' : '⏭️'}
            </div>
            {pointsEarned > 0 && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-green-600"
              >
                +{pointsEarned} pts
              </motion.div>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {action === 'skip' ? 'Skipped' : 'Review submitted!'}
            </h2>
            <p className="text-gray-500">
              {action === 'approve'
                ? 'Great — term marked as reviewed.'
                : action === 'flag'
                ? 'Term flagged for admin attention.'
                : 'Term moved to end of queue.'}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Link
            href="/reviews"
            className="w-full py-3 text-center bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            Next review
          </Link>
          <Link
            href="/home"
            className="w-full py-3 text-center border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Progress bar */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <Link href="/reviews" className="text-gray-400 hover:text-gray-600">←</Link>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
          <div className="h-1.5 bg-green-500 rounded-full w-1/3" />
        </div>
        <span className="text-xs text-gray-400">{queueCount} in queue</span>
      </div>

      {/* Term card */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-400">{term.term_code}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elColor}`}>
              {ELEMENT_LABELS[term.element] ?? term.element}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{term.level_2}</h2>
          {term.level_1 && (
            <p className="text-sm text-gray-400 mt-1">{term.level_1}</p>
          )}
        </div>

        {/* Fields */}
        {fields.map(f => (
          <div key={f.key} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</h3>
              <Link
                href={`/suggest/${term.id}?field=${f.key}`}
                className="text-xs text-green-600 hover:underline"
              >
                ✏️ Edit
              </Link>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 safe-area-inset-bottom">
        <p className="text-xs text-gray-400 text-center mb-3">Does this term look correct?</p>
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => handleAction('approve')}
            className="flex flex-col items-center gap-1 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-colors"
          >
            <span className="text-xl">✅</span>
            <span className="text-xs font-medium">Approve</span>
            <span className="text-xs text-green-600">+10 pts</span>
          </button>
          <Link
            href={`/suggest/${term.id}?from=${assignment.id}`}
            className="flex flex-col items-center gap-1 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors"
          >
            <span className="text-xl">✏️</span>
            <span className="text-xs font-medium">Edit</span>
            <span className="text-xs text-blue-600">+5 pts</span>
          </Link>
          <button
            onClick={() => handleAction('flag')}
            className="flex flex-col items-center gap-1 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl transition-colors"
          >
            <span className="text-xl">🚩</span>
            <span className="text-xs font-medium">Flag</span>
            <span className="text-xs text-orange-600">+10 pts</span>
          </button>
          <button
            onClick={() => handleAction('skip')}
            className="flex flex-col items-center gap-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-xl transition-colors"
          >
            <span className="text-xl">⏭️</span>
            <span className="text-xs font-medium">Skip</span>
            <span className="text-xs text-gray-400">0 pts</span>
          </button>
        </div>
      </div>
    </div>
  );
}

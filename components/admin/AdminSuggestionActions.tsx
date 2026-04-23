'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  suggestion: {
    id: string;
    author_id: string;
    term_id: string | null;
    field_name: string | null;
    proposed_value: string | null;
    proposed_term: Record<string, unknown> | null;
    suggestion_type: string;
    is_major_change: boolean;
  };
}

export function AdminSuggestionActions({ suggestion }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [loading, setLoading]   = useState<'accept' | 'reject' | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  async function accept() {
    setLoading('accept');

    // 1. Apply field edit to taxonomy_terms if applicable
    if (suggestion.suggestion_type === 'field_edit' && suggestion.term_id && suggestion.field_name) {
      await supabase
        .from('taxonomy_terms')
        .update({ [suggestion.field_name]: suggestion.proposed_value })
        .eq('id', suggestion.term_id);
    }

    // 2. If new term, insert it
    if (suggestion.suggestion_type === 'new_term' && suggestion.proposed_term) {
      await supabase
        .from('taxonomy_terms')
        .insert({ ...suggestion.proposed_term, is_active: true, is_proposed: false, proposed_by: suggestion.author_id });
    }

    // 3. Mark suggestion as accepted
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('suggestions')
      .update({ status: 'accepted', reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', suggestion.id);

    // 4. Award points to author
    const pts = suggestion.is_major_change ? 40 : (suggestion.suggestion_type === 'new_term' ? 50 : 20);
    await supabase.from('points_transactions').insert({
      user_id:     suggestion.author_id,
      points:      pts,
      reason:      `Suggestion accepted: ${suggestion.field_name ?? 'new term'}`,
      source_type: 'suggestion_accepted',
      source_id:   suggestion.id,
    });

    // 5. Notify author
    await supabase.from('notifications').insert({
      user_id: suggestion.author_id,
      title:   'Your suggestion was accepted! 🎉',
      body:    `+${pts} pts awarded. Your edit to "${suggestion.field_name ?? 'new term proposal'}" has been applied to the taxonomy.`,
      type:    'suggestion_status',
    });

    setLoading(null);
    router.refresh();
  }

  async function reject() {
    setLoading('reject');
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('suggestions')
      .update({
        status:      'rejected',
        admin_note:  adminNote,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', suggestion.id);

    await supabase.from('notifications').insert({
      user_id: suggestion.author_id,
      title:   'Suggestion update',
      body:    adminNote ? `Your suggestion was not accepted: ${adminNote}` : 'Your suggestion was not accepted at this time.',
      type:    'suggestion_status',
    });

    setLoading(null);
    router.refresh();
  }

  if (showReject) {
    return (
      <div className="space-y-2">
        <textarea
          value={adminNote}
          onChange={e => setAdminNote(e.target.value)}
          placeholder="Reason for rejection (shown to user)"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={reject}
            disabled={loading === 'reject'}
            className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors"
          >
            {loading === 'reject' ? 'Rejecting…' : 'Confirm reject'}
          </button>
          <button
            onClick={() => setShowReject(false)}
            className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={accept}
        disabled={loading !== null}
        className="flex-1 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition-colors"
      >
        {loading === 'accept' ? 'Accepting…' : '✓ Accept'}
      </button>
      <button
        onClick={() => setShowReject(true)}
        disabled={loading !== null}
        className="flex-1 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
      >
        ✗ Reject
      </button>
    </div>
  );
}

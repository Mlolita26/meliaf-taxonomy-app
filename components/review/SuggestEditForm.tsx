'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import type { TaxonomyTerm } from '@/types/database';
import { TERM_FIELDS, ELEMENT_LABELS } from '@/constants/points';

const schema = z.object({
  field_name:      z.string().min(1, 'Select a field'),
  proposed_value:  z.string().min(10, 'Please provide at least 10 characters'),
  rationale:       z.string().optional(),
  is_major_change: z.boolean(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  term: TaxonomyTerm;
  userId: string;
  preSelectedField?: string;
  assignmentId?: string;
}

export function SuggestEditForm({ term, userId, preSelectedField, assignmentId }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [success, setSuccess]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [confidence, setConfidence] = useState(4);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      field_name:      preSelectedField ?? '',
      is_major_change: false,
    },
  });

  const selectedField = watch('field_name');
  const originalValue = selectedField ? (term as any)[selectedField] : undefined;

  async function onSubmit(data: FormData) {
    setLoading(true);

    const { error } = await supabase.from('suggestions').insert({
      term_id:         term.id,
      author_id:       userId,
      assignment_id:   assignmentId ?? null,
      suggestion_type: 'field_edit',
      field_name:      data.field_name,
      original_value:  String(originalValue ?? ''),
      proposed_value:  data.proposed_value,
      rationale:       data.rationale ?? null,
      confidence,
      is_major_change: data.is_major_change,
      status:          'submitted',
    });

    if (!error) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      5,
        reason:      `Field edit suggestion: ${data.field_name} on ${term.term_code}`,
        source_type: 'suggestion_submitted',
      });
      fetch('/api/check-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="p-4 min-h-screen flex flex-col items-center justify-center space-y-4 text-center">
        <div className="text-5xl">✏️</div>
        <h2 className="text-xl font-bold text-gray-900">Suggestion submitted!</h2>
        <p className="text-green-600 font-semibold">+5 pts</p>
        <p className="text-gray-500 text-sm">The admin will review your suggestion. You&apos;ll earn +20 pts if it&apos;s accepted.</p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-4">
          <button
            onClick={() => router.back()}
            className="py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            Back to review
          </button>
          <button
            onClick={() => { setSuccess(false); setValue('proposed_value', ''); }}
            className="py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Suggest another edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Suggest an edit</h1>
          <p className="text-sm text-gray-500">
            {term.level_2} · {ELEMENT_LABELS[term.element] ?? term.element}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Field selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Field to edit</label>
          <select
            {...register('field_name')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select a field…</option>
            {TERM_FIELDS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          {errors.field_name && <p className="text-red-500 text-xs mt-1">{errors.field_name.message}</p>}
        </div>

        {/* Original value (read-only) */}
        {selectedField && originalValue && (
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">Current value</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
              {Array.isArray(originalValue) ? originalValue.join(', ') : String(originalValue)}
            </div>
          </div>
        )}

        {/* Proposed change */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proposed change</label>
          <textarea
            {...register('proposed_value')}
            rows={4}
            placeholder="Enter your suggested text…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          {errors.proposed_value && <p className="text-red-500 text-xs mt-1">{errors.proposed_value.message}</p>}
        </div>

        {/* Confidence — 1, 2, 4, 5 only (no middle ground) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Confidence</label>
          <div className="grid grid-cols-4 gap-2">
            {([
              { value: 1, stars: '⭐', label: 'Unsure' },
              { value: 2, stars: '⭐⭐', label: 'Somewhat' },
              { value: 4, stars: '⭐⭐⭐⭐', label: 'Confident' },
              { value: 5, stars: '⭐⭐⭐⭐⭐', label: 'Very sure' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConfidence(opt.value)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-xs font-medium transition-colors ${
                  confidence === opt.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}
              >
                <span className="text-base leading-none">{opt.stars}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Major change */}
        <label className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl cursor-pointer">
          <input type="checkbox" {...register('is_major_change')} className="w-4 h-4 accent-amber-600" />
          <div>
            <p className="text-sm font-medium text-gray-800">This is a major restructuring</p>
            <p className="text-xs text-gray-500">Check if this changes meaning, scope, or hierarchy significantly</p>
          </div>
        </label>

        {/* Rationale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rationale <span className="text-gray-400 font-normal">(optional but helpful)</span>
          </label>
          <textarea
            {...register('rationale')}
            rows={3}
            placeholder="Why are you suggesting this change?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
          <span className="font-medium">Points preview:</span> +5 pts for submitting · up to +40 pts if accepted
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Submitting…' : 'Submit suggestion'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { ELEMENT_LABELS, ELEMENT_ORDER } from '@/constants/points';
import type { TaxonomyElement } from '@/types/database';

const schema = z.object({
  element:       z.string().min(1, 'Select an element'),
  level_1:       z.string().min(1, 'Required'),
  level_2:       z.string().min(1, 'Required'),
  definition:    z.string().min(20, 'Please write a definition (at least 20 characters)'),
  exclude_if:    z.string().optional(),
  cgiar_example: z.string().optional(),
  related_terms: z.string().optional(),
  rationale:     z.string().min(10, 'Explain why this term should be added'),
});
type FormData = z.infer<typeof schema>;

interface ExistingTerm { element: string; level_1: string | null; level_2: string | null; }

export function ProposeTermForm({ userId, existingTerms }: { userId: string; existingTerms: ExistingTerm[] }) {
  const router   = useRouter();
  const supabase = createClient();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const selectedElement = watch('element') as TaxonomyElement | '';

  const level1Options = Array.from(new Set(
    existingTerms
      .filter(t => t.element === selectedElement && t.level_1)
      .map(t => t.level_1!)
  ));

  async function onSubmit(data: FormData) {
    setLoading(true);
    const proposedTerm = {
      element:       data.element,
      level_1:       data.level_1,
      level_2:       data.level_2,
      definition:    data.definition,
      exclude_if:    data.exclude_if ?? null,
      cgiar_example: data.cgiar_example ?? null,
      related_terms: data.related_terms?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
    };

    const { error } = await supabase.from('suggestions').insert({
      author_id:       userId,
      suggestion_type: 'new_term',
      proposed_term:   proposedTerm,
      rationale:       data.rationale,
      status:          'submitted',
    });

    if (!error) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      15,
        reason:      `New term proposed: ${data.level_2}`,
        source_type: 'new_term_submitted',
      });
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="p-4 min-h-screen flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-5xl">📚</div>
        <h2 className="text-xl font-bold text-gray-900">Term proposed!</h2>
        <p className="text-green-600 font-semibold">+15 pts</p>
        <p className="text-sm text-gray-500">The admin will review your proposal. If accepted, you&apos;ll earn +50 pts.</p>
        <button
          onClick={() => router.push('/browse')}
          className="mt-4 py-2.5 px-6 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
        >
          Browse taxonomy
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Propose a new term</h1>
          <p className="text-sm text-gray-500">Fill in as many fields as you can</p>
        </div>
      </div>

      {/* Level explanation */}
      <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 space-y-1">
        <p><span className="font-semibold">Level 1</span> = high-level category (e.g. Climate risk reduction). Groups related terms together.</p>
        <p><span className="font-semibold">Level 2</span> = the actual term being proposed (e.g. Drought stress).</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Element */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Element *</label>
          <select
            {...register('element')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Select element…</option>
            {ELEMENT_ORDER.map(k => (
              <option key={k} value={k}>{ELEMENT_LABELS[k]}</option>
            ))}
          </select>
          {errors.element && <p className="text-red-500 text-xs mt-1">{errors.element.message}</p>}
        </div>

        {/* Level 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level 1 — Category *</label>
          <input
            {...register('level_1')}
            list="level1-options"
            placeholder="Select or type a category"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <datalist id="level1-options">
            {level1Options.map(opt => <option key={opt} value={opt} />)}
          </datalist>
          {errors.level_1 && <p className="text-red-500 text-xs mt-1">{errors.level_1.message}</p>}
        </div>

        {/* Level 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level 2 — Term name *</label>
          <input
            {...register('level_2')}
            placeholder="The specific term you are proposing"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {errors.level_2 && <p className="text-red-500 text-xs mt-1">{errors.level_2.message}</p>}
        </div>

        {/* Definition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Definition *</label>
          <textarea
            {...register('definition')}
            rows={4}
            placeholder="Describe what this term means in the context of climate adaptation…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          {errors.definition && <p className="text-red-500 text-xs mt-1">{errors.definition.message}</p>}
        </div>

        {/* No adaptation link when */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">No adaptation link when</label>
          <textarea
            {...register('exclude_if')}
            rows={2}
            placeholder="When should this term NOT be used?"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* CGIAR Example */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CGIAR Example</label>
          <textarea
            {...register('cgiar_example')}
            rows={2}
            placeholder="Real example from CGIAR portfolio…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
        </div>

        {/* Related terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Related terms <span className="text-gray-400 font-normal">(comma-separated)</span>
          </label>
          <input
            {...register('related_terms')}
            placeholder="e.g. drought stress, water deficit"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Rationale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Why should this term be added? *</label>
          <textarea
            {...register('rationale')}
            rows={3}
            placeholder="Explain the gap this term fills in the taxonomy…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          {errors.rationale && <p className="text-red-500 text-xs mt-1">{errors.rationale.message}</p>}
        </div>

        <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
          +15 pts for proposing · +50 pts if accepted by the admin
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? 'Submitting…' : 'Propose term'}
        </button>
      </form>
    </div>
  );
}

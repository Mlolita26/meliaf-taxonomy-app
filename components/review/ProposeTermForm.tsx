'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import { ELEMENT_LABELS, ELEMENT_ORDER } from '@/constants/points';
import type { TaxonomyElement } from '@/types/database';

const level2Schema = z.object({
  element:       z.string().min(1, 'Select an element'),
  level_1:       z.string().min(1, 'Select a Level 1 category'),
  level_2:       z.string().min(1, 'Required'),
  definition:    z.string().min(20, 'Please write a definition (at least 20 characters)'),
  exclude_if:    z.string().optional(),
  cgiar_example: z.string().optional(),
  related_terms: z.string().optional(),
  reference:     z.string().optional(),
  rationale:     z.string().min(10, 'Explain why this term should be added'),
});

const level1Schema = z.object({
  element:       z.string().min(1, 'Select an element'),
  level_1:       z.string().min(2, 'Required — this is the category name'),
  definition:    z.string().min(20, 'Please write a definition (at least 20 characters)'),
  exclude_if:    z.string().optional(),
  cgiar_example: z.string().optional(),
  related_terms: z.string().optional(),
  reference:     z.string().optional(),
  rationale:     z.string().min(10, 'Explain why this category should be added'),
});

type Level2Data = z.infer<typeof level2Schema>;
type Level1Data = z.infer<typeof level1Schema>;

interface SuggestedL2 { name: string; definition: string }
interface ExistingTerm { element: string; level_1: string | null; level_2: string | null; }

interface Props {
  userId: string;
  existingTerms: ExistingTerm[];
  defaultType?:    'level_1' | 'level_2';
  defaultElement?: string;
  defaultLevel1?:  string;
}

export function ProposeTermForm({ userId, existingTerms, defaultType, defaultElement, defaultLevel1 }: Props) {
  const router   = useRouter();
  const supabase = createClient();
  const [success, setSuccess]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [proposalType, setProposalType] = useState<'level_2' | 'level_1'>(defaultType ?? 'level_2');
  const [submittedL1, setSubmittedL1]   = useState<{ element: string; level_1: string; l2Count: number } | null>(null);

  // Level 2 terms the user wants to suggest alongside the new L1 category
  const [suggestedL2s, setSuggestedL2s] = useState<SuggestedL2[]>([]);
  const [l2Error, setL2Error]           = useState<string | null>(null);

  const level2Form = useForm<Level2Data>({
    resolver: zodResolver(level2Schema),
    defaultValues: { element: defaultElement ?? '', level_1: defaultLevel1 ?? '' },
  });
  const level1Form = useForm<Level1Data>({
    resolver: zodResolver(level1Schema),
    defaultValues: { element: defaultElement ?? '', level_1: defaultLevel1 ?? '' },
  });

  const selectedElementL2 = level2Form.watch('element') as TaxonomyElement | '';
  const selectedElementL1 = level1Form.watch('element') as TaxonomyElement | '';

  const level1Options = Array.from(new Set(
    existingTerms
      .filter(t => t.element === selectedElementL2 && t.level_1)
      .map(t => t.level_1!)
  )).sort();

  function switchType(type: 'level_2' | 'level_1') {
    setProposalType(type);
    level2Form.reset();
    level1Form.reset();
    setSuggestedL2s([]);
    setL2Error(null);
  }

  function addL2Entry() {
    setSuggestedL2s(prev => [...prev, { name: '', definition: '' }]);
    setL2Error(null);
  }

  function removeL2Entry(i: number) {
    setSuggestedL2s(prev => prev.filter((_, j) => j !== i));
  }

  function updateL2Entry(i: number, field: keyof SuggestedL2, value: string) {
    setSuggestedL2s(prev => prev.map((v, j) => j === i ? { ...v, [field]: value } : v));
    setL2Error(null);
  }

  async function onSubmitLevel2(data: Level2Data) {
    setLoading(true);
    const { error } = await supabase.from('suggestions').insert({
      author_id:       userId,
      suggestion_type: 'new_term',
      proposed_term: {
        element:       data.element,
        level_1:       data.level_1,
        level_2:       data.level_2,
        definition:    data.definition,
        exclude_if:    data.exclude_if ?? null,
        cgiar_example: data.cgiar_example ?? null,
        related_terms: data.related_terms?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        reference:     data.reference ?? null,
      },
      rationale: data.rationale,
      status:    'submitted',
    });
    if (!error) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      15,
        reason:      `New term proposed: ${data.level_2}`,
        source_type: 'new_term_submitted',
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

  async function onSubmitLevel1(data: Level1Data) {
    // Validate any L2 entries the user added
    const filledL2s = suggestedL2s.filter(t => t.name.trim() || t.definition.trim());
    const incompleteL2 = filledL2s.filter(t => !t.name.trim() || !t.definition.trim());
    if (incompleteL2.length > 0) {
      setL2Error('Each suggested term needs both a name and a definition.');
      return;
    }

    setLoading(true);

    // Insert L1 suggestion
    const { error } = await supabase.from('suggestions').insert({
      author_id:       userId,
      suggestion_type: 'new_term',
      proposed_term: {
        element:       data.element,
        level_1:       data.level_1,
        level_2:       null,
        definition:    data.definition,
        exclude_if:    data.exclude_if ?? null,
        cgiar_example: data.cgiar_example ?? null,
        related_terms: data.related_terms?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
        reference:     data.reference ?? null,
      },
      rationale: data.rationale,
      status:    'submitted',
    });

    if (!error) {
      await supabase.from('points_transactions').insert({
        user_id:     userId,
        points:      15,
        reason:      `New Level 1 category proposed: ${data.level_1}`,
        source_type: 'new_term_submitted',
      });

      // Insert each suggested L2 term as its own suggestion
      for (const l2 of filledL2s) {
        await supabase.from('suggestions').insert({
          author_id:       userId,
          suggestion_type: 'new_term',
          proposed_term: {
            element:       data.element,
            level_1:       data.level_1,
            level_2:       l2.name.trim(),
            definition:    l2.definition.trim(),
            exclude_if:    null,
            cgiar_example: null,
            related_terms: [],
            reference:     null,
          },
          rationale: `Proposed alongside new Level 1 category: ${data.level_1}`,
          status:    'submitted',
        });
        await supabase.from('points_transactions').insert({
          user_id:     userId,
          points:      15,
          reason:      `New term proposed: ${l2.name.trim()}`,
          source_type: 'new_term_submitted',
        });
      }

      fetch('/api/check-badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).catch(() => {});

      setSubmittedL1({ element: data.element, level_1: data.level_1, l2Count: filledL2s.length });
      setSuccess(true);
    }
    setLoading(false);
  }

  if (success) {
    const totalPts = proposalType === 'level_1'
      ? 15 + (submittedL1?.l2Count ?? 0) * 15
      : 15;

    return (
      <div className="p-4 min-h-screen flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-5xl">📚</div>
        <h2 className="text-xl font-bold text-gray-900">
          {proposalType === 'level_1' ? 'Category proposed!' : 'Term proposed!'}
        </h2>
        <p className="text-green-600 font-semibold">+{totalPts} pts</p>

        {proposalType === 'level_1' && submittedL1 && submittedL1.l2Count > 0 && (
          <p className="text-sm text-gray-600 max-w-xs">
            Category <span className="font-semibold">{submittedL1.level_1}</span> + {submittedL1.l2Count} term{submittedL1.l2Count > 1 ? 's' : ''} submitted for review.
          </p>
        )}

        <p className="text-sm text-gray-500 max-w-xs">
          The admin will review your proposal. If accepted, you&apos;ll earn +50 pts per item.
        </p>

        {/* Prompt to add more L2 terms only if none were submitted with the L1 */}
        {proposalType === 'level_1' && submittedL1 && submittedL1.l2Count === 0 && (
          <div className="w-full max-w-xs bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3 mt-2">
            <p className="text-sm font-semibold text-amber-800">💡 Do you have terms in mind for this category?</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Proposing Level 2 terms for <span className="font-semibold">{submittedL1.level_1}</span> earns you +15 pts for each one!
            </p>
            <button
              onClick={() => router.push(
                `/propose?type=level_2&element=${encodeURIComponent(submittedL1.element)}&level1=${encodeURIComponent(submittedL1.level_1)}`
              )}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-sm"
            >
              + Suggest Level 2 terms for this category
            </button>
          </div>
        )}

        <button
          onClick={() => router.push('/browse')}
          className="py-2.5 px-6 border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
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

      {/* Type toggle */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm font-medium">
        {(['level_2', 'level_1'] as const).map(type => (
          <button
            key={type}
            type="button"
            onClick={() => switchType(type)}
            className={`flex-1 py-2.5 transition-colors ${
              proposalType === type ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type === 'level_2' ? 'Level 2 term' : 'Level 1 category'}
          </button>
        ))}
      </div>

      {/* Level explanation */}
      <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700 space-y-1">
        {proposalType === 'level_2' ? (
          <>
            <p><span className="font-semibold">Level 2</span> = the specific term you are proposing (e.g. Drought stress).</p>
            <p>It belongs under an existing <span className="font-semibold">Level 1 category</span> — select it from the dropdown below.</p>
          </>
        ) : (
          <>
            <p><span className="font-semibold">Level 1</span> = a high-level category grouping related terms (e.g. Climate risk reduction).</p>
            <p>Propose this when you think an entire new grouping is missing from the taxonomy.</p>
          </>
        )}
      </div>

      {/* ── LEVEL 2 FORM ── */}
      {proposalType === 'level_2' && (
        <form onSubmit={level2Form.handleSubmit(onSubmitLevel2)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Element *</label>
            <select
              {...level2Form.register('element')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Select element…</option>
              {ELEMENT_ORDER.map(k => (
                <option key={k} value={k}>{ELEMENT_LABELS[k]}</option>
              ))}
            </select>
            {level2Form.formState.errors.element && (
              <p className="text-red-500 text-xs mt-1">{level2Form.formState.errors.element.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level 1 — Category *</label>
            {selectedElementL2 && level1Options.length > 0 ? (
              <select
                {...level2Form.register('level_1')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Select a category…</option>
                {level1Options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50">
                {selectedElementL2
                  ? 'No categories found for this element — propose one first.'
                  : 'Select an element first to see categories.'}
              </div>
            )}
            {level2Form.formState.errors.level_1 && (
              <p className="text-red-500 text-xs mt-1">{level2Form.formState.errors.level_1.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level 2 — Term name *</label>
            <input
              {...level2Form.register('level_2')}
              placeholder="The specific term you are proposing"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {level2Form.formState.errors.level_2 && (
              <p className="text-red-500 text-xs mt-1">{level2Form.formState.errors.level_2.message}</p>
            )}
          </div>

          <SharedFields register={level2Form.register} errors={level2Form.formState.errors} />
          <PointsBanner pts={15} />
          <SubmitButton loading={loading} label="Propose term" />
        </form>
      )}

      {/* ── LEVEL 1 FORM ── */}
      {proposalType === 'level_1' && (
        <form onSubmit={level1Form.handleSubmit(onSubmitLevel1)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Element *</label>
            <select
              {...level1Form.register('element')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Select element…</option>
              {ELEMENT_ORDER.map(k => (
                <option key={k} value={k}>{ELEMENT_LABELS[k]}</option>
              ))}
            </select>
            {level1Form.formState.errors.element && (
              <p className="text-red-500 text-xs mt-1">{level1Form.formState.errors.element.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category name *</label>
            <input
              {...level1Form.register('level_1')}
              placeholder="e.g. Climate risk reduction"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {selectedElementL1 && (
              <p className="text-xs text-gray-400 mt-1">
                Existing: {existingTerms
                  .filter(t => t.element === selectedElementL1 && t.level_1)
                  .map(t => t.level_1!)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .join(', ') || 'none yet'}
              </p>
            )}
            {level1Form.formState.errors.level_1 && (
              <p className="text-red-500 text-xs mt-1">{level1Form.formState.errors.level_1.message}</p>
            )}
          </div>

          <SharedFields register={level1Form.register} errors={level1Form.formState.errors} />

          {/* ── Suggested Level 2 terms ── */}
          <div className="space-y-3 pt-1">
            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-800">
                Terms suggested inside this category
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                If you already have specific terms in mind for this category, add them here. Each term earns you +15 pts and will be reviewed alongside the category.
              </p>
            </div>

            {suggestedL2s.map((entry, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Term {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeL2Entry(i)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={entry.name}
                  onChange={e => updateL2Entry(i, 'name', e.target.value)}
                  placeholder="Term name *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
                <textarea
                  value={entry.definition}
                  onChange={e => updateL2Entry(i, 'definition', e.target.value)}
                  placeholder="Definition *"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none bg-white"
                />
              </div>
            ))}

            {l2Error && (
              <p className="text-red-500 text-xs">{l2Error}</p>
            )}

            <button
              type="button"
              onClick={addL2Entry}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl text-sm hover:border-green-400 hover:text-green-600 transition-colors"
            >
              + Add a term to this category
            </button>
          </div>

          <PointsBanner pts={15 + suggestedL2s.length * 15} extra={suggestedL2s.length > 0 ? `(${1 + suggestedL2s.length} proposals)` : undefined} />
          <SubmitButton loading={loading} label="Propose category" />
        </form>
      )}
    </div>
  );
}

function SharedFields({ register, errors }: { register: any; errors: any }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Definition *</label>
        <textarea {...register('definition')} rows={4} placeholder="Describe what this means in the context of climate adaptation…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        {errors.definition && <p className="text-red-500 text-xs mt-1">{errors.definition.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">No adaptation link when</label>
        <textarea {...register('exclude_if')} rows={2} placeholder="When should this NOT be used?"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">CGIAR Example</label>
        <textarea {...register('cgiar_example')} rows={2} placeholder="Real example from CGIAR portfolio…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Related terms <span className="text-gray-400 font-normal">(comma-separated)</span>
        </label>
        <input {...register('related_terms')} placeholder="e.g. drought stress, water deficit"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Links with term</label>
        <input {...register('reference')} placeholder="Other terms or concepts this links to"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Why should this be added? *</label>
        <textarea {...register('rationale')} rows={3} placeholder="Explain the gap this fills in the taxonomy…"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
        {errors.rationale && <p className="text-red-500 text-xs mt-1">{errors.rationale.message}</p>}
      </div>
    </>
  );
}

function PointsBanner({ pts, extra }: { pts: number; extra?: string }) {
  return (
    <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700">
      +{pts} pts for submitting{extra ? ` ${extra}` : ''} · +50 pts per item if accepted
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors">
      {loading ? 'Submitting…' : label}
    </button>
  );
}

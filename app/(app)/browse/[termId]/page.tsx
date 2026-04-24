import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';
import AgreeButton from './AgreeButton';
import CancelSuggestionButton from './CancelSuggestionButton';

export default async function TermDetailPage({
  params,
  searchParams,
}: {
  params: { termId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const suggestionId = typeof searchParams.suggestionId === 'string' ? searchParams.suggestionId : null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: term } = await supabase
    .from('taxonomy_terms')
    .select('*')
    .eq('id', params.termId)
    .single();

  if (!term) notFound();

  const isL1 = !term.level_2;
  const elementColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';

  const fields = [
    { key: 'definition',    label: 'Definition',              value: term.definition },
    { key: 'exclude_if',    label: 'No adaptation link when', value: term.exclude_if },
    { key: 'cgiar_example', label: 'CGIAR Example',           value: term.cgiar_example },
    { key: 'related_terms', label: 'Related terms',           value: Array.isArray(term.related_terms) ? term.related_terms.join(', ') : term.related_terms },
    { key: 'reference',     label: 'Links with term',         value: term.reference },
  ].filter(f => f.value);

  // Back: L1 terms go to element view; L2 terms go to their parent L1 list
  const backHref = isL1
    ? `/browse?element=${term.element}`
    : `/browse?element=${term.element}&level1=${encodeURIComponent(term.level_1)}`;

  const backLabel = isL1
    ? (ELEMENT_LABELS[term.element] ?? term.element)
    : (term.level_1 ?? ELEMENT_LABELS[term.element] ?? term.element);

  return (
    <div className="p-4 space-y-4">
      <Link href={backHref} className="text-sm text-gray-500 hover:text-gray-800 pt-2 block">
        ← {backLabel}
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>
            {ELEMENT_LABELS[term.element] ?? term.element}
          </span>
          {!isL1 && term.level_1 && <span className="text-xs text-gray-400">{term.level_1}</span>}
          {isL1 && <span className="text-xs text-gray-400 font-medium">Level 1 category</span>}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{term.level_2 ?? term.level_1}</h1>

        {/* Guidance banner for L1 category pages */}
        {isL1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">You are viewing a top-level category.</span> You can review and validate its definition below, or explore the specific terms that belong to this category.
          </div>
        )}

        {/* Agree button — available to all logged-in users */}
        {user && (
          <AgreeButton termId={term.id} termCode={term.term_code} userId={user.id} />
        )}

        {/* For L1 terms: link to browse child terms */}
        {isL1 && term.level_1 && (
          <Link
            href={`/browse?element=${term.element}&level1=${encodeURIComponent(term.level_1)}`}
            className="block w-full py-2 text-center text-sm bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
          >
            Browse terms in this category →
          </Link>
        )}
      </div>

      {/* Fields */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</h3>
                {!suggestionId && (
                  <Link href={`/suggest/${term.id}?field=${f.key}`} className="text-xs text-green-600 hover:underline">
                    Suggest edit
                  </Link>
                )}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-4">
        {suggestionId ? (
          <CancelSuggestionButton suggestionId={suggestionId} />
        ) : (
          <>
            <Link
              href={`/suggest/${term.id}`}
              className="flex-1 py-2.5 text-center border border-green-600 text-green-700 font-medium rounded-xl hover:bg-green-50 transition-colors text-sm"
            >
              Suggest a change
            </Link>
            <Link
              href="/propose"
              className="flex-1 py-2.5 text-center border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Propose new term
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

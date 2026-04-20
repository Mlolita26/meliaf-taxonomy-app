import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

export default async function TermDetailPage({ params }: { params: { termId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: term } = await supabase
    .from('taxonomy_terms')
    .select('*')
    .eq('id', params.termId)
    .single();

  if (!term) notFound();

  // Check if user has an active assignment for this term
  const { data: assignment } = user
    ? await supabase
        .from('review_assignments')
        .select('id, status')
        .eq('term_id', term.id)
        .eq('reviewer_id', user.id)
        .in('status', ['pending', 'in_progress'])
        .maybeSingle()
    : { data: null };

  // Get review count
  const { count: reviewCount } = await supabase
    .from('review_assignments')
    .select('*', { count: 'exact', head: true })
    .eq('term_id', term.id)
    .neq('status', 'skipped');

  const elementColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';

  const fields = [
    { key: 'definition',    label: 'Definition',    value: term.definition },
    { key: 'include_if',    label: 'Include if',    value: term.include_if },
    { key: 'exclude_if',    label: 'Exclude if',    value: term.exclude_if },
    { key: 'cgiar_example', label: 'CGIAR Example', value: term.cgiar_example },
    { key: 'related_terms', label: 'Related Terms', value: term.related_terms?.join(', ') },
    { key: 'reference',     label: 'Reference',     value: term.reference },
    { key: 'notes',         label: 'Notes',         value: term.notes },
  ].filter(f => f.value);

  return (
    <div className="p-4 space-y-4">
      {/* Back */}
      <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-800">← Browse</Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400">{term.term_code}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>
            {ELEMENT_LABELS[term.element] ?? term.element}
          </span>
          <span className="ml-auto text-xs text-gray-400">
            {reviewCount ?? 0}/2 reviewed
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{term.level_2}</h1>
        {term.level_1 && (
          <p className="text-sm text-gray-500">
            {term.level_1}
            {term.level_3 && ` › ${term.level_3}`}
          </p>
        )}

        {assignment && (
          <Link
            href={`/reviews/${assignment.id}`}
            className="block w-full py-2.5 text-center bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
          >
            {assignment.status === 'in_progress' ? 'Continue review' : 'Start your review'}
          </Link>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3">
        {fields.map(f => (
          <div key={f.key} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</h3>
              <Link
                href={`/suggest/${term.id}?field=${f.key}`}
                className="text-xs text-green-600 hover:underline"
              >
                Suggest edit
              </Link>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed">{f.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
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
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

interface SearchParams { element?: string; q?: string; view?: 'list' | 'hierarchy' }

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { element, q, view = 'list' } = searchParams;

  let query = supabase
    .from('taxonomy_terms')
    .select('id, term_code, element, level_1, level_2, level_3, definition, is_active')
    .eq('is_active', true)
    .order('term_code');

  if (element) query = query.eq('element', element);
  if (q)       query = query.or(`level_2.ilike.%${q}%,definition.ilike.%${q}%,term_code.ilike.%${q}%`);

  const { data: terms = [] } = await query;

  // Get review counts per term
  const termIds = (terms ?? []).map((t: any) => t.id);
  const { data: reviewCounts } = await supabase
    .from('review_assignments')
    .select('term_id')
    .in('term_id', termIds)
    .neq('status', 'skipped');

  const countMap: Record<string, number> = {};
  (reviewCounts ?? []).forEach((r: any) => {
    countMap[r.term_id] = (countMap[r.term_id] ?? 0) + 1;
  });

  const elements = Object.keys(ELEMENT_LABELS);

  function ReviewDots({ count }: { count: number }) {
    return (
      <div className="flex gap-1">
        {[0, 1].map(i => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full ${i < count ? 'bg-green-500' : 'bg-gray-200'}`}
            title={`${count}/2 reviewers`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Browse Taxonomy</h1>
        <Link
          href="/propose"
          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Propose term
        </Link>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search terms…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {element && <input type="hidden" name="element" value={element} />}
        <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
          Search
        </button>
      </form>

      {/* Element filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Link
          href={q ? `/browse?q=${q}` : '/browse'}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !element ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          All
        </Link>
        {elements.map(el => (
          <Link
            key={el}
            href={`/browse?element=${el}${q ? `&q=${q}` : ''}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              element === el
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {ELEMENT_LABELS[el]}
          </Link>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500">{(terms ?? []).length} terms</p>

      {/* Term list */}
      <div className="space-y-2">
        {(terms ?? []).map((term: any) => {
          const reviewCount = countMap[term.id] ?? 0;
          const elementColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';
          return (
            <Link
              key={term.id}
              href={`/browse/${term.id}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-gray-400">{term.term_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>
                      {ELEMENT_LABELS[term.element] ?? term.element}
                    </span>
                  </div>
                  <p className="font-medium text-gray-800 truncate">{term.level_2}</p>
                  {term.level_1 && (
                    <p className="text-xs text-gray-400 mt-0.5">{term.level_1}</p>
                  )}
                  {term.definition && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{term.definition}</p>
                  )}
                </div>
                <ReviewDots count={reviewCount} />
              </div>
            </Link>
          );
        })}

        {(terms ?? []).length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No terms found.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ELEMENT_LABELS, ELEMENT_COLORS, ELEMENT_DESCRIPTIONS, ELEMENT_ORDER } from '@/constants/points';

interface SearchParams { element?: string; level1?: string; q?: string }

export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { element, level1, q } = searchParams;

  // ── Drilled-in view: element + level1 selected → show L2 terms ──────────
  if (element && level1) {
    const { data: terms = [] } = await supabase
      .from('taxonomy_terms')
      .select('id, term_code, element, level_1, level_2, definition, is_active')
      .eq('is_active', true)
      .eq('element', element)
      .eq('level_1', level1)
      .order('level_2');

    const termIds = (terms ?? []).map((t: any) => t.id);
    const { data: reviewCounts } = await supabase
      .from('review_assignments')
      .select('term_id')
      .in('term_id', termIds.length ? termIds : ['none'])
      .neq('status', 'skipped');

    const countMap: Record<string, number> = {};
    (reviewCounts ?? []).forEach((r: any) => {
      countMap[r.term_id] = (countMap[r.term_id] ?? 0) + 1;
    });

    const elementColor = ELEMENT_COLORS[element] ?? 'bg-gray-100 text-gray-700';

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/browse?element=${element}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← {ELEMENT_LABELS[element] ?? element}
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>
              {ELEMENT_LABELS[element] ?? element}
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{level1}</h1>
          <p className="text-sm text-gray-500 mt-1">{(terms ?? []).length} terms</p>
        </div>

        <Link
          href="/propose"
          className="inline-block text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          + Propose term
        </Link>

        <div className="space-y-2">
          {(terms ?? []).map((term: any) => {
            const reviewCount = countMap[term.id] ?? 0;
            return (
              <Link
                key={term.id}
                href={`/browse/${term.id}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{term.level_2}</p>
                    {term.definition && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{term.definition}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 pt-0.5">
                    {[0, 1].map(i => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < reviewCount ? 'bg-green-500' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
          {(terms ?? []).length === 0 && (
            <div className="text-center py-12 text-gray-400"><p>No terms found.</p></div>
          )}
        </div>
      </div>
    );
  }

  // ── Element selected → show Level 1 categories for that element ──────────
  if (element) {
    const { data: terms = [] } = await supabase
      .from('taxonomy_terms')
      .select('id, element, level_1, level_2')
      .eq('is_active', true)
      .eq('element', element);

    // Group by level_1
    const grouped: Record<string, number> = {};
    (terms ?? []).forEach((t: any) => {
      const l1 = t.level_1 ?? '(no category)';
      grouped[l1] = (grouped[l1] ?? 0) + 1;
    });
    const level1List = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
    const elementColor = ELEMENT_COLORS[element] ?? 'bg-gray-100 text-gray-700';
    const description = ELEMENT_DESCRIPTIONS[element];

    return (
      <div className="p-4 space-y-4">
        <Link href="/browse" className="text-sm text-gray-500 hover:text-gray-800 pt-2 block">← Browse</Link>

        <div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>
            {ELEMENT_LABELS[element] ?? element}
          </span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">{ELEMENT_LABELS[element] ?? element}</h1>
          {description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Element filter row */}
        <FilterRow active={element} q={q} />

        <p className="text-sm text-gray-500">{level1List.length} categories · {(terms ?? []).length} terms</p>

        <div className="space-y-2">
          {level1List.map(([l1, count]) => (
            <Link
              key={l1}
              href={`/browse?element=${element}&level1=${encodeURIComponent(l1)}`}
              className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-800">{l1}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{count} term{count !== 1 ? 's' : ''}</p>
                </div>
                <span className="text-gray-300 text-lg">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── Default view: search results (flat) or all L1 categories by element ──
  if (q) {
    const { data: terms = [] } = await supabase
      .from('taxonomy_terms')
      .select('id, element, level_1, level_2, definition, is_active')
      .eq('is_active', true)
      .or(`level_2.ilike.%${q}%,definition.ilike.%${q}%,level_1.ilike.%${q}%`)
      .order('element').order('level_1').order('level_2');

    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h1 className="text-xl font-bold text-gray-900">Browse Taxonomy</h1>
          <Link href="/propose" className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
            + Propose term
          </Link>
        </div>
        <form method="GET" className="flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search terms…" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Search</button>
        </form>
        <FilterRow active={undefined} q={q} />
        <p className="text-sm text-gray-500">{(terms ?? []).length} results for "{q}"</p>
        <div className="space-y-2">
          {(terms ?? []).map((term: any) => {
            const elementColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';
            return (
              <Link key={term.id} href={`/browse/${term.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>{ELEMENT_LABELS[term.element] ?? term.element}</span>
                  {term.level_1 && <span className="text-xs text-gray-400">{term.level_1}</span>}
                </div>
                <p className="font-medium text-gray-800">{term.level_2}</p>
                {term.definition && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{term.definition}</p>}
              </Link>
            );
          })}
          {(terms ?? []).length === 0 && <div className="text-center py-12 text-gray-400"><p>No results found.</p></div>}
        </div>
      </div>
    );
  }

  // ── Default: all L1 categories grouped by element ────────────────────────
  const { data: allTerms = [] } = await supabase
    .from('taxonomy_terms')
    .select('element, level_1')
    .eq('is_active', true);

  // Build element → level1 → count map
  const byElement: Record<string, Record<string, number>> = {};
  (allTerms ?? []).forEach((t: any) => {
    const el = t.element;
    const l1 = t.level_1 ?? '(no category)';
    if (!byElement[el]) byElement[el] = {};
    byElement[el][l1] = (byElement[el][l1] ?? 0) + 1;
  });

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Browse Taxonomy</h1>
        <Link href="/propose" className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
          + Propose term
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" placeholder="Search terms…" className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
        <button type="submit" className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">Search</button>
      </form>

      <FilterRow active={undefined} q={undefined} />

      {ELEMENT_ORDER.filter(el => byElement[el]).map(el => {
        const level1List = Object.entries(byElement[el]).sort(([a], [b]) => a.localeCompare(b));
        const elementColor = ELEMENT_COLORS[el] ?? 'bg-gray-100 text-gray-700';
        const description = ELEMENT_DESCRIPTIONS[el];
        return (
          <div key={el} className="space-y-2">
            <div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${elementColor}`}>{ELEMENT_LABELS[el] ?? el}</span>
              <h2 className="text-base font-bold text-gray-900 mt-1">{ELEMENT_LABELS[el] ?? el}</h2>
              {description && <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            {level1List.map(([l1, count]) => (
              <Link
                key={l1}
                href={`/browse?element=${el}&level1=${encodeURIComponent(l1)}`}
                className="block bg-white rounded-xl border border-gray-100 p-4 hover:border-green-200 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{l1}</p>
                    <p className="text-xs text-gray-400 mt-0.5 italic">Definition coming soon · {count} term{count !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </div>
              </Link>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FilterRow({ active, q }: { active?: string; q?: string }) {
  const qParam = q ? `&q=${q}` : '';
  return (
    <div className="flex flex-wrap gap-2">
      {ELEMENT_ORDER.map(el => (
        <Link
          key={el}
          href={`/browse?element=${el}${qParam}`}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            active === el
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
          }`}
        >
          {ELEMENT_LABELS[el]}
        </Link>
      ))}
      <Link
        href={q ? `/browse?q=${q}` : '/browse'}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
          !active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
        }`}
      >
        All
      </Link>
    </div>
  );
}

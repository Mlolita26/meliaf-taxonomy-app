import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ELEMENT_LABELS, ELEMENT_COLORS } from '@/constants/points';

interface SearchParams { element?: string; q?: string }

export default async function AdminTermsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient();
  const { element, q } = searchParams;

  let query = supabase
    .from('taxonomy_terms')
    .select('id, term_code, element, level_1, level_2, is_active, is_proposed, version')
    .order('term_code');

  if (element) query = query.eq('element', element);
  if (q)       query = query.or(`level_2.ilike.%${q}%,term_code.ilike.%${q}%`);

  const { data: terms } = await query;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Terms ({(terms ?? []).length})</h1>
        <a
          href="/api/admin/export-csv"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Search */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search terms…"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        {element && <input type="hidden" name="element" value={element} />}
        <button type="submit" className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg">Search</button>
      </form>

      {/* Terms table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Code</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Element</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Term (Level 2)</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(terms ?? []).map((term: any) => {
              const elColor = ELEMENT_COLORS[term.element] ?? 'bg-gray-100 text-gray-700';
              return (
                <tr key={term.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{term.term_code}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${elColor}`}>
                      {ELEMENT_LABELS[term.element] ?? term.element}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-800">{term.level_2}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {!term.is_active && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Inactive</span>}
                      {term.is_proposed && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Proposed</span>}
                      {term.is_active && !term.is_proposed && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Active</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/browse/${term.id}`} className="text-xs text-blue-600 hover:underline">View</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

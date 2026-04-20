import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return new NextResponse('Forbidden', { status: 403 });

  const { data: terms } = await supabase
    .from('taxonomy_terms')
    .select('*')
    .eq('is_active', true)
    .order('term_code');

  const headers = [
    'Id', 'Element', 'Level 1', 'Level 2', 'Level 3',
    'Definition', 'Include if', 'Exclude if', 'CGIAR example',
    'Related terms', 'Reference', 'Notes', 'Version',
  ];

  function escapeCSV(value: string | null | undefined): string {
    if (value == null) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const rows = [
    headers.join(','),
    ...(terms ?? []).map((t: any) =>
      [
        t.term_code, t.element, t.level_1, t.level_2, t.level_3,
        t.definition, t.include_if, t.exclude_if, t.cgiar_example,
        (t.related_terms ?? []).join('; '),
        t.reference, t.notes, t.version,
      ].map(escapeCSV).join(',')
    ),
  ];

  const csv = rows.join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="AdaptationTaxonomy-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

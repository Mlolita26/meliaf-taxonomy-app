/**
 * One-time seed script: reads AdaptationTaxonomy.xlsx and upserts all terms into Supabase.
 * Run: npx ts-node --esm scripts/seed-taxonomy.ts
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { createRequire } from 'module';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Path to the taxonomy Excel file — adjust if needed
const TAXONOMY_PATH = path.resolve(
  process.env.TAXONOMY_PATH ||
  "C:/Users/mlolita/OneDrive - CGIAR/Nowak, Andreea (Alliance Bioversity-CIAT)'s files - MELIAF-Implementation/_Taxonomy/AdaptationTaxonomy.xlsx"
);

const ELEMENT_MAP: Record<string, string> = {
  'Rationale':             'Rationale',
  'Intervention':          'Intervention',
  'Outcome_process':       'Outcome_process',
  'Outcome_early':         'Outcome_early',
  'Outcome_intermediate':  'Outcome_intermediate',
  'Outcome':               'Outcome',
  'Impact':                'Impact',
  'Beneficiary':           'Beneficiary',
};

interface RawRow {
  Id?: string;
  Element?: string;
  'Level 1'?: string;
  'Level 2'?: string;
  'Level 3'?: string;
  Definition?: string;
  'Include if'?: string;
  'Exclude if'?: string;
  'CGIAR example'?: string;
  'Related terms'?: string;
  Reference?: string;
  Notes?: string;
}

function parseRelatedTerms(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
}

async function main() {
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`Taxonomy file not found: ${TAXONOMY_PATH}`);
    console.error('Set TAXONOMY_PATH env var to override.');
    process.exit(1);
  }

  console.log(`Reading: ${TAXONOMY_PATH}`);
  const workbook  = XLSX.readFile(TAXONOMY_PATH);
  const sheetName = 'Human-readable';

  if (!workbook.Sheets[sheetName]) {
    console.error(`Sheet "${sheetName}" not found. Available:`, workbook.SheetNames);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: undefined,
  }) as RawRow[];

  const terms = rows
    .filter((r: RawRow) => r.Id && r.Element)
    .map((r: RawRow) => ({
      term_code:     String(r.Id!).trim(),
      element:       ELEMENT_MAP[String(r.Element!).trim()] ?? String(r.Element!).trim(),
      level_1:       r['Level 1']     ? String(r['Level 1']).trim()     : null,
      level_2:       r['Level 2']     ? String(r['Level 2']).trim()     : null,
      level_3:       r['Level 3']     ? String(r['Level 3']).trim()     : null,
      definition:    r.Definition     ? String(r.Definition).trim()     : null,
      include_if:    r['Include if']  ? String(r['Include if']).trim()  : null,
      exclude_if:    r['Exclude if']  ? String(r['Exclude if']).trim()  : null,
      cgiar_example: r['CGIAR example']? String(r['CGIAR example']).trim(): null,
      related_terms: parseRelatedTerms(r['Related terms']),
      reference:     r.Reference      ? String(r.Reference).trim()      : null,
      notes:         r.Notes          ? String(r.Notes).trim()          : null,
    }));

  console.log(`Parsed ${terms.length} terms. Upserting...`);

  const { error } = await supabase
    .from('taxonomy_terms')
    .upsert(terms, { onConflict: 'term_code' });

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  console.log(`✓ Successfully seeded ${terms.length} terms.`);

  // Verify
  const { count } = await supabase
    .from('taxonomy_terms')
    .select('*', { count: 'exact', head: true });
  console.log(`Total terms in DB: ${count}`);
}

main().catch(console.error);

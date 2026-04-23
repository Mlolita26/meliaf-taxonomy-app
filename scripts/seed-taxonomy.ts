/**
 * Seed script: reads AdaptationTaxonomy.xlsx (Human-readable-app sheet) and upserts all terms.
 * L1 rows are inserted with level_2 = null so the browse page can display their definitions.
 * L2 rows carry their L1 parent name looked up from the same sheet via "Child of" reference.
 *
 * Run: npx tsx scripts/seed-taxonomy.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
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

const TAXONOMY_PATH = path.resolve(
  process.env.TAXONOMY_PATH ||
  "C:/Users/mlolita/OneDrive - CGIAR/Nowak, Andreea (Alliance Bioversity-CIAT)'s files - MELIAF-Implementation/_Taxonomy/AdaptationTaxonomy.xlsx"
);

// Human-readable-app sheet columns (0-based index):
// 0=Id, 1=Element, 2=Level, 3=Name, 4=Definition, 5=k (exclude_if / no adaptation link when)
// 6=Related terms, 7=CGIAR example, 8=Parent of, 9=Child of, 10=Links with, 11=Reference, 12=Notes

interface RawRow {
  Id?:            string;
  Element?:       string;
  Level?:         string;
  Name?:          string;
  Definition?:    string;
  k?:             string;   // "No adaptation link when" (exclude_if)
  'Related terms'?: string;
  'CGIAR example'?: string;
  'Parent of'?:   string;
  'Child of'?:    string;
  'Links with'?:  string;
  Reference?:     string;
  Notes?:         string;
}

function parseRelatedTerms(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
}

async function main() {
  if (!fs.existsSync(TAXONOMY_PATH)) {
    console.error(`Taxonomy file not found: ${TAXONOMY_PATH}`);
    process.exit(1);
  }

  console.log(`Reading: ${TAXONOMY_PATH}`);
  const workbook  = XLSX.readFile(TAXONOMY_PATH);
  const sheetName = 'Human-readable-app';

  if (!workbook.Sheets[sheetName]) {
    console.error(`Sheet "${sheetName}" not found. Available:`, workbook.SheetNames);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: undefined,
  }) as RawRow[];

  // First pass: build a map from term ID → L1 name (for L2 rows to look up their parent)
  const idToL1Name: Record<string, string> = {};
  for (const r of rows) {
    if (r.Id && r.Level === 'Level 1' && r.Name) {
      idToL1Name[String(r.Id).trim()] = String(r.Name).trim();
    }
  }

  const terms: any[] = [];

  for (const r of rows) {
    if (!r.Id || !r.Element || !r.Level || !r.Name) continue;

    const termCode = String(r.Id).trim();
    const element  = String(r.Element).trim();
    const level    = String(r.Level).trim();
    const name     = String(r.Name).trim();

    if (level === 'Level 1') {
      // L1 row: level_2 = null, level_1 = Name
      terms.push({
        term_code:     termCode,
        element,
        level_1:       name,
        level_2:       null,
        level_3:       null,
        definition:    r.Definition     ? String(r.Definition).trim()     : null,
        exclude_if:    r.k              ? String(r.k).trim()              : null,
        cgiar_example: r['CGIAR example'] ? String(r['CGIAR example']).trim() : null,
        related_terms: parseRelatedTerms(r['Related terms']),
        reference:     r['Links with']  ? String(r['Links with']).trim()  : null,
        notes:         r.Notes          ? String(r.Notes).trim()          : null,
        include_if:    null,
        is_active:     true,
        is_proposed:   false,
      });
    } else if (level === 'Level 2') {
      // L2 row: level_2 = Name, derive level_1 from "Child of" reference
      const parentId = r['Child of'] ? String(r['Child of']).trim() : null;
      const level1   = parentId ? (idToL1Name[parentId] ?? null) : null;

      terms.push({
        term_code:     termCode,
        element,
        level_1:       level1,
        level_2:       name,
        level_3:       null,
        definition:    r.Definition     ? String(r.Definition).trim()     : null,
        exclude_if:    r.k              ? String(r.k).trim()              : null,
        cgiar_example: r['CGIAR example'] ? String(r['CGIAR example']).trim() : null,
        related_terms: parseRelatedTerms(r['Related terms']),
        reference:     r['Links with']  ? String(r['Links with']).trim()  : null,
        notes:         r.Notes          ? String(r.Notes).trim()          : null,
        include_if:    null,
        is_active:     true,
        is_proposed:   false,
      });
    }
    // Skip any other levels
  }

  const l1Count = terms.filter(t => t.level_2 === null).length;
  const l2Count = terms.filter(t => t.level_2 !== null).length;
  console.log(`Parsed ${terms.length} rows (${l1Count} L1 categories + ${l2Count} L2 terms). Upserting…`);

  const { error } = await supabase
    .from('taxonomy_terms')
    .upsert(terms, { onConflict: 'term_code' });

  if (error) {
    console.error('Upsert failed:', error.message);
    process.exit(1);
  }

  const { count } = await supabase
    .from('taxonomy_terms')
    .select('*', { count: 'exact', head: true });

  console.log(`✓ Done. Total terms in DB: ${count}`);
}

main().catch(console.error);

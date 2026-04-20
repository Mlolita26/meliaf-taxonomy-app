export const POINTS = {
  REVIEW_COMPLETE:          10,
  SUGGESTION_SUBMITTED:     5,
  SUGGESTION_ACCEPTED:      20,
  MAJOR_SUGGESTION_ACCEPTED:40,
  NEW_TERM_SUBMITTED:       15,
  NEW_TERM_ACCEPTED:        50,
  STREAK_DAILY:             3,
  FIRST_REVIEW_BONUS:       15,
  ALL_ASSIGNED_BONUS:       25,
} as const;

export const ELEMENT_LABELS: Record<string, string> = {
  Rationale:            'Rationale',
  Intervention:         'Intervention',
  Outcome_process:      'Outcome (Process)',
  Outcome_early:        'Outcome (Early)',
  Outcome_intermediate: 'Outcome (Intermediate)',
  Outcome:              'Outcome',
  Impact:               'Impact',
  Beneficiary:          'Beneficiary',
};

export const ELEMENT_COLORS: Record<string, string> = {
  Rationale:            'bg-orange-100 text-orange-800',
  Intervention:         'bg-blue-100 text-blue-800',
  Outcome_process:      'bg-purple-100 text-purple-800',
  Outcome_early:        'bg-teal-100 text-teal-800',
  Outcome_intermediate: 'bg-cyan-100 text-cyan-800',
  Outcome:              'bg-green-100 text-green-800',
  Impact:               'bg-emerald-100 text-emerald-800',
  Beneficiary:          'bg-pink-100 text-pink-800',
};

export const TERM_FIELDS = [
  { key: 'definition',    label: 'Definition' },
  { key: 'include_if',    label: 'Include if' },
  { key: 'exclude_if',    label: 'Exclude if' },
  { key: 'cgiar_example', label: 'CGIAR Example' },
  { key: 'related_terms', label: 'Related Terms' },
  { key: 'reference',     label: 'Reference' },
  { key: 'notes',         label: 'Notes' },
  { key: 'level_1',       label: 'Level 1' },
  { key: 'level_2',       label: 'Level 2' },
  { key: 'level_3',       label: 'Level 3' },
] as const;

export type TermFieldKey = typeof TERM_FIELDS[number]['key'];

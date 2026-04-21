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

// Ordered list for filter buttons (All is appended at end in the UI)
export const ELEMENT_ORDER = [
  'Rationale',
  'Intervention',
  'Outcome_process',
  'Outcome_early',
  'Outcome_intermediate',
  'Outcome',
  'Impact',
  'Beneficiary',
];

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

export const ELEMENT_DESCRIPTIONS: Record<string, string> = {
  Rationale:            'The climate problem or opportunity that makes adaptation necessary or desirable for a given population or system. Captures why action is needed: the specific hazard, exposure condition, or capacity gap.',
  Intervention:         'The investment area through which CGIAR contributes to addressing the adaptation rationale. Captures what is done: the policy, practice, technology, service, or institutional change delivered or enabled.',
  Outcome_process:      'A tangible product or service produced by an intervention. Captures what was delivered: assessments completed, plans developed, tools created, systems established.',
  Outcome_early:        'A first-order change in the reach or awareness of target groups. Captures who was reached and what they know or can now access. Does not yet imply behavior change.',
  Outcome_intermediate: 'A change in behavior, practice, or policy by target groups following exposure to an output or short-term outcome. Captures what people or institutions started doing differently.',
  Outcome:              'A measurable change in the state of a system — production system, institution, or landscape — resulting from sustained behavior or policy change.',
  Impact:               'A welfare consequence experienced by people as a result of system-level change. Captures what it meant for human wellbeing: income losses avoided, food security maintained, displacement prevented.',
  Beneficiary:          'The person, group, or institution that experiences outcomes or impacts from CGIAR adaptation work. Captures for whom the adaptation chain operates.',
};

export const TERM_FIELDS = [
  { key: 'level_2',       label: 'Term name' },
  { key: 'definition',    label: 'Definition' },
  { key: 'exclude_if',    label: 'No adaptation link when' },
  { key: 'cgiar_example', label: 'CGIAR Example' },
  { key: 'related_terms', label: 'Related terms' },
] as const;

export type TermFieldKey = typeof TERM_FIELDS[number]['key'];

INSERT INTO public.badge_definitions (code, name, description, icon, category, points_value, requirement, is_hidden, sort_order) VALUES
  ('first_review',    'First Look',          'Completed your very first term review',               '🔍', 'milestone', 0,  '{"type":"review_count","threshold":1}',  false, 1),
  ('five_reviews',    'Getting Started',     'Completed 5 term reviews',                            '📝', 'milestone', 5,  '{"type":"review_count","threshold":5}',  false, 2),
  ('ten_reviews',     'Dedicated Reviewer',  'Completed 10 term reviews',                           '🎯', 'milestone', 10, '{"type":"review_count","threshold":10}', false, 3),
  ('all_assigned',    'Full Commitment',     'Reviewed every single term assigned to you',          '✅', 'milestone', 25, '{"type":"all_assigned"}',               false, 4),
  ('first_suggestion','Pen in Hand',         'Submitted your first field edit suggestion',          '✏️', 'milestone', 0,  '{"type":"suggestion_count","threshold":1}',  false, 5),
  ('five_suggestions','Sharp Eye',           'Submitted 5 suggestions',                             '👁️', 'milestone', 5,  '{"type":"suggestion_count","threshold":5}',  false, 6),
  ('suggestion_ace',  'Suggestion Ace',      '5 of your suggestions were accepted by the admin',   '⭐', 'quality',   15, '{"type":"accepted_count","threshold":5}',  false, 7),
  ('eagle_eye',       'Eagle Eye',           '3 of your major suggestions were accepted',           '🦅', 'quality',   30, '{"type":"major_accepted_count","threshold":3}', false, 8),
  ('first_term',      'Vocabulary Builder',  'Proposed a new taxonomy term',                        '📚', 'milestone', 0,  '{"type":"new_term_count","threshold":1}', false, 9),
  ('pioneer',         'Pioneer',             'One of your proposed terms was accepted into the taxonomy', '🚀', 'special', 50, '{"type":"new_term_accepted","threshold":1}', false, 10),
  ('streak_3',        'Hat Trick',           '3-day login streak',                                  '🔥', 'streak',    5,  '{"type":"streak","threshold":3}',   false, 11),
  ('streak_7',        'Week Warrior',        '7-day login streak',                                  '🔥', 'streak',    15, '{"type":"streak","threshold":7}',   false, 12),
  ('streak_30',       'Iron Reviewer',       '30-day login streak',                                 '🔥', 'streak',    50, '{"type":"streak","threshold":30}',  false, 13),
  ('top_3',           'Podium Finisher',     'Reached top 3 on the leaderboard',                   '🏆', 'special',   20, '{"type":"rank","threshold":3}',     false, 14),
  ('completionist',   'Completionist',       'Reviewed all 96 terms in the taxonomy',               '💎', 'special',   100,'{"type":"review_count","threshold":96}', true, 15),
  ('night_owl',       'Night Owl',           'Submitted a review between 11pm and 4am',             '🦉', 'special',   5,  '{"type":"time_of_day","start":23,"end":4}', true, 16)
ON CONFLICT (code) DO NOTHING;

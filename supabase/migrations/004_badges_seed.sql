INSERT INTO public.badge_definitions (code, name, description, icon, category, points_value, requirement, is_hidden, sort_order)
VALUES
  ('first_review',   'First Look',       'Completed your very first term review',            '🔍', 'milestone', 0,  '{"type":"review_count","threshold":1}',       false, 1),
  ('sharp_eye',      'Sharp Eye',        'Your first suggestion was accepted by the admin',  '👁️', 'quality',   10, '{"type":"accepted_count","threshold":1}',      false, 2),
  ('suggestion_ace', 'Suggestion Ace',   '5 of your suggestions were accepted',              '⭐', 'quality',   15, '{"type":"accepted_count","threshold":5}',      false, 3),
  ('streak_7',       'Week Warrior',     'Reviewed across 2 or more separate weeks',         '🔥', 'streak',    15, '{"type":"streak","threshold":7}',             false, 4),
  ('top_3',          'Podium Finisher',  'Reached the top 3 on the leaderboard',             '🏆', 'special',   20, '{"type":"rank","threshold":3}',               false, 5)
ON CONFLICT (code) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  icon        = EXCLUDED.icon,
  category    = EXCLUDED.category,
  points_value= EXCLUDED.points_value,
  requirement = EXCLUDED.requirement,
  is_hidden   = EXCLUDED.is_hidden,
  sort_order  = EXCLUDED.sort_order;

-- Remove old badges no longer in use
DELETE FROM public.badge_definitions
WHERE code NOT IN ('first_review','sharp_eye','suggestion_ace','streak_7','top_3');

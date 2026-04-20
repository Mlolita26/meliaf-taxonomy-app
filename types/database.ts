// ─── Domain types ──────────────────────────────────────────────────────────────

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Profile {
  id: string;
  pseudonym: string;
  avatar_seed: string | null;
  institution: string | null;
  is_admin: boolean;
  is_active: boolean;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  onboarding_done: boolean;
  preferred_element: string | null;
  created_at: string;
  updated_at: string;
}

export type TaxonomyElement =
  | 'Rationale'
  | 'Intervention'
  | 'Outcome_process'
  | 'Outcome_early'
  | 'Outcome_intermediate'
  | 'Outcome'
  | 'Impact'
  | 'Beneficiary';

export interface TaxonomyTerm {
  id: string;
  term_code: string;
  element: TaxonomyElement;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  definition: string | null;
  include_if: string | null;
  exclude_if: string | null;
  cgiar_example: string | null;
  related_terms: string[];
  reference: string | null;
  notes: string | null;
  is_active: boolean;
  is_proposed: boolean;
  proposed_by: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface ReviewAssignment {
  id: string;
  term_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  assigned_at: string;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  time_spent_s: number | null;
}

export type SuggestionType = 'field_edit' | 'new_term' | 'hierarchy_change';
export type SuggestionStatus = 'draft' | 'submitted' | 'accepted' | 'rejected';

export interface Suggestion {
  id: string;
  assignment_id: string | null;
  term_id: string | null;
  author_id: string;
  suggestion_type: SuggestionType;
  field_name: string | null;
  original_value: string | null;
  proposed_value: string | null;
  proposed_term: Json | null;
  rationale: string | null;
  confidence: number | null;
  is_major_change: boolean;
  status: SuggestionStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
}

export interface BadgeDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string;
  category: 'milestone' | 'streak' | 'quality' | 'speed' | 'special';
  points_value: number;
  requirement: Json;
  is_hidden: boolean;
  sort_order: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  seen: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string | null;
  payload: Json;
  read: boolean;
  sent_at: string;
}

export interface LeaderboardEntry {
  id: string;
  pseudonym: string;
  avatar_seed: string | null;
  total_points: number;
  current_streak: number;
  reviews_done: number;
  suggestions_made: number;
  suggestions_accepted: number;
  badges_earned: number;
  rank: number;
}

export interface AppSetting {
  key: string;
  value: Json;
  updated_at: string;
}

// ─── Joined types ─────────────────────────────────────────────────────────────

export interface AssignmentWithTerm extends ReviewAssignment {
  taxonomy_terms: TaxonomyTerm;
}

export interface UserBadgeWithDef extends UserBadge {
  badge_definitions: BadgeDefinition;
}

// ─── Supabase Database generic ───────────────────────────────────────────────
// Structured to match Supabase's GenericSchema so typed clients work.

type NoRelationships = [];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
        Relationships: NoRelationships;
      };
      taxonomy_terms: {
        Row: TaxonomyTerm;
        Insert: Omit<TaxonomyTerm, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<TaxonomyTerm, 'id' | 'created_at'>>;
        Relationships: NoRelationships;
      };
      review_assignments: {
        Row: ReviewAssignment;
        Insert: Omit<ReviewAssignment, 'id' | 'assigned_at'> & { id?: string; assigned_at?: string };
        Update: Partial<Omit<ReviewAssignment, 'id' | 'assigned_at'>>;
        Relationships: NoRelationships;
      };
      suggestions: {
        Row: Suggestion;
        Insert: Omit<Suggestion, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Omit<Suggestion, 'id' | 'created_at'>>;
        Relationships: NoRelationships;
      };
      points_transactions: {
        Row: PointsTransaction;
        Insert: Omit<PointsTransaction, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<PointsTransaction>;
        Relationships: NoRelationships;
      };
      badge_definitions: {
        Row: BadgeDefinition;
        Insert: Omit<BadgeDefinition, 'id'> & { id?: string };
        Update: Partial<BadgeDefinition>;
        Relationships: NoRelationships;
      };
      user_badges: {
        Row: UserBadge;
        Insert: Omit<UserBadge, 'id' | 'earned_at'> & { id?: string; earned_at?: string };
        Update: Partial<UserBadge>;
        Relationships: NoRelationships;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'sent_at'> & { id?: string; sent_at?: string };
        Update: Partial<Notification>;
        Relationships: NoRelationships;
      };
      app_settings: {
        Row: AppSetting;
        Insert: Omit<AppSetting, 'updated_at'> & { updated_at?: string };
        Update: Partial<AppSetting>;
        Relationships: NoRelationships;
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
        Relationships: NoRelationships;
      };
    };
    Functions: {
      record_daily_login: {
        Args: { p_user_id: string };
        Returns: { streak: number; points_earned: number };
      };
      get_next_term_for_reviewer: {
        Args: { p_user_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, string[]>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
};

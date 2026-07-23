import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface Skill {
  id: string;
  name: string;
  subject: string;
  parent_id: string | null;
  difficulty: number;
  icon: string;
  order_index: number;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  mastery_level: number;
  attempts: number;
  successful_attempts: number;
  last_practiced: string;
  created_at: string;
}

export interface SkillWithProgress extends Skill {
  mastery_level: number;
  attempts: number;
  successful_attempts: number;
  last_practiced: string | null;
  children?: SkillWithProgress[];
  prerequisites_met?: boolean;
}

export interface SkillRecommendation {
  skill: SkillWithProgress;
  reason: string;
  priority: number; // 1 = highest
}

// ============================================================================
// SKILL TREE OPERATIONS
// ============================================================================

/**
 * Fetch all skills with user progress for a specific user
 */
export async function getSkillTreeWithProgress(userId: string): Promise<SkillWithProgress[]> {
  const { data: skills, error: skillsError } = await supabase
    .from('skills')
    .select('*')
    .order('order_index', { ascending: true });

  if (skillsError) {
    console.error('Error fetching skills:', skillsError);
    return [];
  }

  const { data: userSkills, error: userSkillsError } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId);

  if (userSkillsError) {
    console.error('Error fetching user skills:', userSkillsError);
  }

  // Build user skill map for quick lookup
  const userSkillMap = new Map<string, UserSkill>();
  userSkills?.forEach(us => userSkillMap.set(us.skill_id, us));

  // Build tree: map by ID
  const skillMap = new Map<string, SkillWithProgress>();
  skills?.forEach(skill => {
    skillMap.set(skill.id, {
      ...skill,
      mastery_level: userSkillMap.get(skill.id)?.mastery_level || 0,
      attempts: userSkillMap.get(skill.id)?.attempts || 0,
      successful_attempts: userSkillMap.get(skill.id)?.successful_attempts || 0,
      last_practiced: userSkillMap.get(skill.id)?.last_practiced || null,
      children: []
    });
  });

  // Build hierarchy
  const roots: SkillWithProgress[] = [];
  skills?.forEach(skill => {
    const skillWithProgress = skillMap.get(skill.id)!;
    if (skill.parent_id) {
      const parent = skillMap.get(skill.parent_id);
      if (parent) {
        parent.children!.push(skillWithProgress);
      } else {
        roots.push(skillWithProgress);
      }
    } else {
      roots.push(skillWithProgress);
    }
  });

  // Sort children by order_index
  const sortChildren = (node: SkillWithProgress) => {
    node.children?.sort((a, b) => a.order_index - b.order_index);
    node.children?.forEach(sortChildren);
  };
  roots.forEach(sortChildren);

  return roots;
}

/**
 * Get all skills flat (for search/selection)
 */
export async function getAllSkills(): Promise<Skill[]> {
  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching all skills:', error);
    return [];
  }
  return data || [];
}

/**
 * Check if user has met prerequisites for a skill
 */
export async function checkPrerequisitesMet(userId: string, skillId: string): Promise<boolean> {
  // Get prerequisites for this skill
  const { data: prereqs, error: prereqError } = await supabase
    .from('skill_prerequisites')
    .select('requires_skill_id')
    .eq('skill_id', skillId);

  if (prereqError || !prereqs?.length) return true;

  // Check user progress on each prerequisite
  const { data: userSkills, error: userSkillError } = await supabase
    .from('user_skills')
    .select('skill_id, mastery_level')
    .eq('user_id', userId)
    .in('skill_id', prereqs.map(p => p.requires_skill_id));

  if (userSkillError) return false;

  const userSkillMap = new Map(userSkills?.map(us => [us.skill_id, us.mastery_level]) || []);

  // All prerequisites must have mastery >= 0.6 (60%)
  return prereqs.every(p => (userSkillMap.get(p.requires_skill_id) || 0) >= 0.6);
}

/**
 * Get skills that are unlocked (prerequisites met) for a user
 */
export async function getUnlockedSkills(userId: string): Promise<string[]> {
  const { data: allSkills } = await supabase.from('skills').select('id');
  if (!allSkills) return [];

  const checks = await Promise.all(
    allSkills.map(s => checkPrerequisitesMet(userId, s.id))
  );

  return allSkills.filter((_, i) => checks[i]).map(s => s.id);
}

/**
 * Get next recommended skill for a user
 */
export async function getRecommendedSkill(userId: string): Promise<SkillRecommendation | null> {
  const unlockedIds = await getUnlockedSkills(userId);
  if (!unlockedIds.length) return null;

  // Get user progress on unlocked skills
  const { data: userSkills } = await supabase
    .from('user_skills')
    .select('skill_id, mastery_level, last_practiced, attempts')
    .eq('user_id', userId)
    .in('skill_id', unlockedIds);

  const userSkillMap = new Map(userSkills?.map(us => [us.skill_id, us]) || []);

  // Get skill details for unlocked skills
  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .in('id', unlockedIds);

  if (!skills?.length) return null;

  // Score each unlocked skill:
  // - Lower mastery = higher priority (needs work)
  // - Not yet started = highest priority
  // - Prerequisites for other locked skills = higher priority
  // - Recently practiced = lower priority (spacing effect)
  const recommendations: SkillRecommendation[] = [];

  for (const skill of skills) {
    const progress = userSkillMap.get(skill.id);
    const mastery = progress?.mastery_level || 0;
    const attempts = progress?.attempts || 0;
    const lastPracticed = progress?.last_practiced ? new Date(progress.last_practiced).getTime() : 0;
    const daysSincePractice = lastPracticed ? (Date.now() - lastPracticed) / (1000 * 60 * 60 * 24) : 999;

    let priority = 0;
    let reason = '';

    if (mastery === 0 && attempts === 0) {
      priority = 1;
      reason = 'Never practiced — start here';
    } else if (mastery < 0.4) {
      priority = 2;
      reason = `Struggling (${Math.round(mastery * 100)}% mastery)`;
    } else if (mastery < 0.7) {
      priority = 3;
      reason = `Developing (${Math.round(mastery * 100)}% mastery)`;
    } else if (daysSincePractice > 7) {
      priority = 4;
      reason = `Due for review (${Math.round(daysSincePractice)} days ago)`;
    } else {
      continue; // Skip mastered & recently practiced
    }

    // Boost priority if this skill unlocks others
    const { data: dependents } = await supabase
      .from('skill_prerequisites')
      .select('skill_id')
      .eq('requires_skill_id', skill.id);

    if (dependents && dependents.length > 0) {
      const lockedDependents = dependents.filter(d => !unlockedIds.includes(d.skill_id));
      if (lockedDependents.length > 0) {
        priority = Math.max(1, priority - 1);
        reason += ` — unlocks ${lockedDependents.length} skill(s)`;
      }
    }

    recommendations.push({ skill: { ...skill, mastery_level: mastery, attempts, successful_attempts: progress?.successful_attempts || 0, last_practiced: progress?.last_practiced || null }, reason, priority });
  }

  // Sort by priority, then by difficulty (easier first for same priority)
  recommendations.sort((a, b) => a.priority - b.priority || a.skill.difficulty - b.skill.difficulty);

  return recommendations[0] || null;
}

/**
 * Update user skill progress after a session
 */
export async function updateUserSkillProgress(
  userId: string,
  skillId: string,
  success: boolean
): Promise<void> {
  const now = new Date().toISOString();

  // Get current progress
  const { data: existing } = await supabase
    .from('user_skills')
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .single();

  if (existing) {
    const newAttempts = existing.attempts + 1;
    const newSuccesses = existing.successful_attempts + (success ? 1 : 0);
    // Simple mastery calculation: success rate weighted by attempts
    const newMastery = Math.min(1, newSuccesses / Math.max(1, newAttempts) * 0.9 + 0.1 * (newSuccesses / Math.max(1, newAttempts)));

    await supabase
      .from('user_skills')
      .update({
        mastery_level: newMastery,
        attempts: newAttempts,
        successful_attempts: newSuccesses,
        last_practiced: now,
        updated_at: now
      })
      .eq('id', existing.id);
  } else {
    // First attempt
    await supabase
      .from('user_skills')
      .insert({
        user_id: userId,
        skill_id: skillId,
        mastery_level: success ? 0.15 : 0.05,
        attempts: 1,
        successful_attempts: success ? 1 : 0,
        last_practiced: now
      });
  }
}

/**
 * Get mastery color for UI
 */
export function getMasteryColor(mastery: number): string {
  if (mastery === 0) return 'text-black/30';
  if (mastery < 0.3) return 'text-red-600';
  if (mastery < 0.6) return 'text-amber-600';
  if (mastery < 0.85) return 'text-blue-600';
  return 'text-green-600';
}

/**
 * Get mastery label for UI
 */
export function getMasteryLabel(mastery: number): string {
  if (mastery === 0) return 'Not Started';
  if (mastery < 0.3) return 'Struggling';
  if (mastery < 0.6) return 'Developing';
  if (mastery < 0.85) return 'Proficient';
  return 'Mastered';
}

/**
 * Get mastery ring conic gradient
 */
export function getMasteryGradient(mastery: number): string {
  const deg = Math.round(mastery * 360);
  const color = mastery === 0 ? '#e5e5e5' : mastery < 0.3 ? '#ef4444' : mastery < 0.6 ? '#f59e0b' : mastery < 0.85 ? '#3b82f6' : '#22c55e';
  return `conic-gradient(${color} ${deg}deg, #e5e5e5 ${deg}deg)`;
}
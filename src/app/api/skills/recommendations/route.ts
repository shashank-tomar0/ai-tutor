import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAllSkills, checkPrerequisitesMet } from '@/utils/skill-engine';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get all skills
    const { data: allSkills } = await supabase
      .from('skills')
      .select('id, name, subject, difficulty, icon, description')
      .order('difficulty', { ascending: true });

    if (!allSkills?.length) {
      return NextResponse.json({ recommendation: null });
    }

    // Get user's progress
    const { data: userSkills } = await supabase
      .from('user_skills')
      .select('skill_id, mastery_level, attempts, last_practiced')
      .eq('user_id', userId);

    const userSkillMap = new Map(userSkills?.map(us => [us.skill_id, us]) || []);

    // Get all prerequisite relationships
    const { data: allPrereqs } = await supabase
      .from('skill_prerequisites')
      .select('skill_id, requires_skill_id');

    // Build prerequisite map
    const prereqMap = new Map<string, string[]>();
    allPrereqs?.forEach(p => {
      const existing = prereqMap.get(p.skill_id) || [];
      existing.push(p.requires_skill_id);
      prereqMap.set(p.skill_id, existing);
    });

    // Check which skills are unlocked (prerequisites met)
    const candidates: Array<{
      skill: typeof allSkills[0];
      mastery: number;
      attempts: number;
      lastPracticed: string | null;
      unlocks: number;
      score: number;
      reason: string;
    }> = [];

    for (const skill of allSkills) {
      const progress = userSkillMap.get(skill.id);
      const mastery = progress?.mastery_level || 0;
      const attempts = progress?.attempts || 0;
      const lastPracticed = progress?.last_practiced || null;

      // Check prerequisites
      const prereqs = prereqMap.get(skill.id) || [];
      let preprequisitesMet = true;
      for (const prereqId of prereqs) {
        const prereqMastery = userSkillMap.get(prereqId)?.mastery_level || 0;
        if (prereqMastery < 0.6) {
          preprequisitesMet = false;
          break;
        }
      }

      if (!preprequisitesMet) continue;

      // Count how many other skills this one unlocks
      let unlocks = 0;
      for (const [dependentId, dependentPrereqs] of prereqMap.entries()) {
        if (dependentPrereqs.includes(skill.id) && !userSkillMap.get(dependentId)?.mastery_level) {
          unlocks++;
        }
      }

      // Scoring
      const daysSincePractice = lastPracticed
        ? (Date.now() - new Date(lastPracticed).getTime()) / (1000 * 60 * 60 * 24)
        : 999;

      // Avoid floating point issues for score
      let score = 0;
      let reason = '';

      if (mastery === 0 && attempts === 0) {
        score = 100;
        reason = 'Never practiced — start here';
      } else if (mastery < 0.3) {
        score = 90 - Math.round(mastery * 100);
        reason = `Still struggling (${Math.round(mastery * 100)}% mastery)`;
      } else if (mastery < 0.6) {
        score = 70 - Math.round(mastery * 100);
        reason = `Developing (${Math.round(mastery * 100)}% mastery)`;
      } else if (mastery < 0.85) {
        if (daysSincePractice > 7) {
          score = 50 + Math.min(20, Math.round(daysSincePractice));
          reason = `Due for review (${Math.round(daysSincePractice)} days ago)`;
        } else {
          continue; // Proficient and recent — skip
        }
      } else {
        continue; // Mastered — skip
      }

      // Boost for gateway skills (unlock many others)
      score += unlocks * 5;

      candidates.push({ skill, mastery, attempts, lastPracticed, unlocks, score, reason });
    }

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    const top = candidates[0] || null;

    return NextResponse.json({
      recommendation: top ? {
        skill: top.skill,
        mastery_level: top.mastery,
        attempts: top.attempts,
        reason: top.reason,
        unlocks: top.unlocks
      } : null,
      candidates: candidates.slice(0, 10).map(c => ({
        skill: { id: c.skill.id, name: c.skill.name, icon: c.skill.icon, difficulty: c.skill.difficulty },
        score: c.score,
        reason: c.reason
      }))
    });
  } catch (error) {
    console.error('Recommendation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

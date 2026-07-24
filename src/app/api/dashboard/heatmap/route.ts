import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // 1. Fetch skills with user_skills progress
    const { data: skillsData } = await supabase
      .from('skills')
      .select('id, name, subject');

    const { data: userSkillsData } = await supabase
      .from('user_skills')
      .select('skill_id, mastery_level');

    // 2. Fetch interventions
    const { data: interventionsData } = await supabase
      .from('interventions')
      .select('concept, skill_id');

    const conceptScores: Record<string, { totalMastery: number; count: number; interventions: number }> = {};

    // Group user skills by concept name
    skillsData?.forEach((skill) => {
      conceptScores[skill.name] = { totalMastery: 0, count: 0, interventions: 0 };
    });

    userSkillsData?.forEach((us) => {
      const skillName = skillsData?.find(s => s.id === us.skill_id)?.name;
      if (skillName) {
        if (!conceptScores[skillName]) {
          conceptScores[skillName] = { totalMastery: 0, count: 0, interventions: 0 };
        }
        conceptScores[skillName].totalMastery += (us.mastery_level || 0) * 100;
        conceptScores[skillName].count += 1;
      }
    });

    interventionsData?.forEach((it) => {
      const concept = it.concept || 'General';
      if (!conceptScores[concept]) {
        conceptScores[concept] = { totalMastery: 0, count: 0, interventions: 0 };
      }
      conceptScores[concept].interventions += 1;
    });

    const heatmapData = Object.keys(conceptScores).map((concept) => {
      const entry = conceptScores[concept];
      const avgMastery = entry.count > 0 ? Math.round(entry.totalMastery / entry.count) : 0;
      // Weighted score combining mastery and active interventions
      const score = entry.count > 0 ? avgMastery : Math.max(10, Math.min(100, entry.interventions * 15));
      return { concept, score };
    }).filter(item => item.score > 0).slice(0, 10);

    return NextResponse.json(heatmapData.length > 0 ? heatmapData : [
      { concept: 'Arithmetic', score: 85 },
      { concept: 'Algebra', score: 70 },
      { concept: 'Geometry', score: 60 }
    ]);
  } catch (error) {
    console.error('Heatmap API error:', error);
    return NextResponse.json({ error: 'Failed to fetch heatmap data' }, { status: 500 });
  }
}

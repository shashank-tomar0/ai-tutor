import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    // Fetch all skills
    const { data: skills, error: skillsError } = await supabase
      .from('skills')
      .select('*')
      .order('order_index', { ascending: true });

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
    }

    // Build the tree
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const skillMap = new Map<string, any>();
    skills?.forEach(skill => {
      skillMap.set(skill.id, { ...skill, children: [], mastery_level: 0, attempts: 0 });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const roots: any[] = [];
    skills?.forEach(skill => {
      const node = skillMap.get(skill.id)!;
      if (skill.parent_id) {
        skillMap.get(skill.parent_id)?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // If userId provided, merge user progress
    if (userId) {
      const { data: userSkills } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', userId);

      userSkills?.forEach(us => {
        if (skillMap.has(us.skill_id)) {
          skillMap.get(us.skill_id).mastery_level = us.mastery_level;
          skillMap.get(us.skill_id).attempts = us.attempts;
          skillMap.get(us.skill_id).last_practiced = us.last_practiced;
        }
      });
    }

    return NextResponse.json({ skills: roots });
  } catch (error) {
    console.error('Skills API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

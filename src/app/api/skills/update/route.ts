import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const { userId, skillId, success } = await req.json();

    if (!userId || !skillId) {
      return NextResponse.json({ error: 'userId and skillId are required' }, { status: 400 });
    }

    if (typeof success !== 'boolean') {
      return NextResponse.json({ error: 'success must be a boolean' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Get current progress for this user+skill
    const { data: existing } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .single();

    if (existing) {
      const newAttempts = existing.attempts + 1;
      const newSuccesses = existing.successful_attempts + (success ? 1 : 0);
      const successRate = newSuccesses / Math.max(1, newAttempts);
      // Compounding mastery: success rate weighted, with diminishing returns on high attempts
      const newMastery = Math.min(1,
        (successRate * 0.8 + 0.2 * (newSuccesses / Math.max(1, newAttempts * 0.5)))
        * Math.min(1, 0.5 + newAttempts * 0.05)
      );

      const { error } = await supabase
        .from('user_skills')
        .update({
          mastery_level: Math.round(newMastery * 100) / 100,
          attempts: newAttempts,
          successful_attempts: newSuccesses,
          last_practiced: now,
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating skill progress:', error);
        return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
      }

      return NextResponse.json({
        mastery_level: Math.round(newMastery * 100) / 100,
        attempts: newAttempts,
        successful_attempts: newSuccesses,
        previous_mastery: existing.mastery_level
      });
    } else {
      // First attempt for this skill
      const initialMastery = success ? 0.15 : 0.05;

      const { error } = await supabase
        .from('user_skills')
        .insert({
          user_id: userId,
          skill_id: skillId,
          mastery_level: initialMastery,
          attempts: 1,
          successful_attempts: success ? 1 : 0,
          last_practiced: now,
        });

      if (error) {
        console.error('Error creating skill progress:', error);
        return NextResponse.json({ error: 'Failed to create progress' }, { status: 500 });
      }

      return NextResponse.json({
        mastery_level: initialMastery,
        attempts: 1,
        successful_attempts: success ? 1 : 0,
        previous_mastery: 0
      });
    }
  } catch (error) {
    console.error('Skill update API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

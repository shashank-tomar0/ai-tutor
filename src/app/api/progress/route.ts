import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Fetch user_skills with the related skill name, ordered by last_practiced DESC
    const { data: userSkills, error } = await supabase
      .from('user_skills')
      .select('*, skills(name)')
      .eq('user_id', userId)
      .order('last_practiced', { ascending: false });

    if (error) {
      console.error('Error fetching user skills:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress data' },
        { status: 500 }
      );
    }

    // --- Build sorted unique practice date strings (YYYY-MM-DD) ---
    const dateStrs = [
      ...new Set(
        (userSkills ?? [])
          .filter((us) => us.last_practiced)
          .map((us) => {
            const d = new Date(us.last_practiced);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          }),
      ),
    ].sort().reverse();

    // --- Streak: consecutive days ending on today or yesterday ---
    let streak = 0;
    if (dateStrs.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const mostRecentStr = dateStrs[0];

      // Only count if the user practised today or yesterday
      if (mostRecentStr === todayStr || mostRecentStr === yesterdayStr) {
        streak = 1;
        for (let i = 1; i < dateStrs.length; i++) {
          const prev = new Date(dateStrs[i - 1] + 'T00:00:00');
          const curr = new Date(dateStrs[i] + 'T00:00:00');
          const diffDays = Math.round(
            (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays === 1) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // --- Weekly completed: skills with mastery >= 0.6 in the last 7 days ---
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyCompleted = (userSkills ?? []).filter((us) => {
      if (!us.last_practiced) return false;
      return (
        new Date(us.last_practiced) >= sevenDaysAgo &&
        (us.mastery_level ?? 0) >= 0.6
      );
    }).length;

    // --- Last session: most recent practice record ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastSkill: any = userSkills?.[0] ?? null;
    const lastSession = lastSkill
      ? {
          date: lastSkill.last_practiced,
          skillName: lastSkill.skills?.name ?? 'Unknown',
          masteryGain: lastSkill.mastery_level ?? 0,
        }
      : null;

    return NextResponse.json({
      streak,
      bestStreak: streak,
      weeklyGoal: 5,
      weeklyCompleted,
      lastSession,
    });
  } catch (error) {
    console.error('Progress API error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}

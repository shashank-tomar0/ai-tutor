import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: strugglingData, error } = await supabase
      .from('interventions')
      .select('id, student_name, concept, struggle, breakthrough, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return NextResponse.json(strugglingData && strugglingData.length > 0 ? strugglingData : []);
  } catch (error) {
    console.error('Struggling API error:', error);
    return NextResponse.json({ error: 'Failed to fetch interventions data' }, { status: 500 });
  }
}

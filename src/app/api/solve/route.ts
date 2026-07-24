import { NextResponse } from 'next/server';
import { getOpenRouterKey } from '@/utils/server-env';

// Reads the math problem on the student's canvas (an image) and returns a FULL
// worked solution. Unlike the Socratic /api/chat-audio path, this deliberately
// gives the answer — it's the "Solve" action. Uses OpenRouter Gemini vision.
export async function POST(req: Request) {
  try {
    const { canvasImage, skill, hint } = await req.json();

    if (!canvasImage) {
      return NextResponse.json({ error: 'No canvas image provided' }, { status: 400 });
    }

    const orKey = getOpenRouterKey();
    if (!orKey) {
      return NextResponse.json({ error: 'Vision service not configured' }, { status: 500 });
    }

    const skillLine = skill?.name ? `The topic is likely "${skill.name}". ` : '';

    const systemPrompt = `You are Newton, a brilliant math tutor. An IMAGE of a student's whiteboard is attached.
${skillLine}Read the math problem written or drawn on it (handwriting, equations, diagrams) and SOLVE it completely.

Respond ONLY with JSON in this exact shape:
{
  "problem": string,          // the problem exactly as you read it
  "solution_text": string,    // the full step-by-step worked solution as PLAIN TEXT with each step on its own line (use \\n between lines). No markdown, no LaTeX, no asterisks — plain readable math like "Step 1: 2x + 3 = 11".
  "spoken_summary": string    // one or two sentences summarizing the answer, to be read aloud
}
If you cannot find a clear problem, set "problem" to "" and explain in "spoken_summary".`;

    const body = {
      model: 'google/gemini-2.5-flash',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: hint ? `Solve the problem on my canvas and show every step. Student's request: "${hint}"` : 'Solve the problem on my canvas and show every step.' },
            { type: 'image_url', image_url: { url: canvasImage } },
          ],
        },
      ],
    };

    const call = (withJsonMode: boolean) => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${orKey}` },
      body: JSON.stringify(withJsonMode ? body : { ...body, response_format: undefined }),
    });

    let resp = await call(true);
    if (!resp.ok) resp = await call(false);
    if (!resp.ok) {
      console.error('Solve vision error:', resp.status, await resp.text());
      return NextResponse.json({ error: 'Vision model error' }, { status: 500 });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let result: any = {};
    try {
      result = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : {};
    }

    return NextResponse.json({
      problem: result.problem || '',
      solution_text: result.solution_text || '',
      spoken_summary: result.spoken_summary || 'Here is the full solution on your canvas.',
    });
  } catch (error) {
    console.error('Solve API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

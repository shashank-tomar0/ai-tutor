import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { parseCanvas } from '@/utils/canvas-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { transcript, shapes, skill, user_id, student_name } = await req.json();

    let skillContext = "";
    if (skill) {
      skillContext = `Current skill focus: ${skill.name}${skill.description ? ` — ${skill.description}` : ''}`;
    }

    // 1. Summarize the shapes on the canvas for the LLM
    const canvasContext = parseCanvas(shapes);

    // 2. Query Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Newton, an expert Socratic AI tutor. You guide students through Socratic questioning — you NEVER just give answers.
          ${skillContext ? `\nCurrent skill focus: ${skillContext}` : ''}
          Canvas state summary: ${canvasContext}

          Your job:
          - Read the canvas and what the student said
          - Ask a guiding Socratic question to make them THINK (do not give the answer directly)
          - If you want to show a visual explanation on the canvas (steps, equations, diagram labels), put it in "canvas_content" as an array of short lines
          - ONLY populate "canvas_content" when it genuinely helps (e.g. showing numbered steps, a formula, a labeled diagram) — do NOT put your chat response there
          - If the student is just asking a conceptual question, answer in "response_text" only — leave "canvas_content" empty
          - Keep "response_text" conversational and under 3 sentences

          Respond ONLY in this exact JSON format:
          {
            "is_struggling": boolean,
            "concept": string,
            "response_text": string,
            "canvas_content": string[] | null
          }

          Examples of good "canvas_content" (visual aid, not chat dump):
          - ["Step 1: Identify the variable", "Step 2: Isolate x", "Step 3: Solve → x = 5"]
          - ["F = ma", "F = force (Newtons)", "m = mass (kg)", "a = acceleration (m/s²)"]
          - null (when no visual aid needed)`
        },
        {
          role: "user",
          content: `Student says: "${transcript}"`
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // 3. Log to Supabase if struggling
    if (result.is_struggling) {
      const studentLabel = student_name || 'Student';
      const { error } = await supabase.from('interventions').insert([{
        user_id: user_id || null,
        student_name: studentLabel,
        concept: result.concept || skill?.name || 'General',
        struggle: transcript,
        skill_id: skill?.id || null
      }]);

      if (error) console.error("Supabase insert error:", error);
    }

    return NextResponse.json({
      type: "ai_response",
      text: result.response_text || "I'm listening. Tell me more.",
      canvas_content: result.canvas_content || null
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const formData = await req.formData();
    const audioFile = formData.get('file') as File | null;
    const textDirect = formData.get('text') as string | null;
    const shapesRaw = formData.get('shapes') as string;
    const skillRaw = formData.get('skill') as string;
    const userIdRaw = formData.get('user_id') as string | null;
    const studentNameRaw = formData.get('student_name') as string | null;

    let skillContext = "";
    let parsedSkill: any = null;
    if (skillRaw) {
      try {
        parsedSkill = JSON.parse(skillRaw);
        if (parsedSkill?.name) {
          skillContext = `Current skill focus: ${parsedSkill.name}${parsedSkill.description ? ` — ${parsedSkill.description}` : ''}`;
        }
      } catch(e) {}
    }

    let transcript = "";
    if (textDirect) {
      transcript = textDirect;
    } else if (audioFile) {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-large-v3",
        response_format: "json"
      });
      transcript = transcription.text;
    } else {
      return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 });
    }

    console.log("Input text:", transcript);

    if (!transcript || transcript.trim() === '') {
        return NextResponse.json({
            type: "ai_response",
            text: "I didn't quite catch that. Could you speak up or type your message?",
            transcript: ""
        });
    }

    // 2. Summarize the shapes on the canvas for the LLM
    let parsedShapes: unknown[] = [];
    try { parsedShapes = JSON.parse(shapesRaw); } catch {/* not provided */}

    const canvasContext = parseCanvas(parsedShapes);

    // 3. Query Groq LLM Socratic Engine
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Newton, an expert Socratic AI tutor. You guide students through Socratic questioning — you NEVER just give answers directly.
          ${skillContext ? `\nCurrent skill focus: ${skillContext}` : ''}
          Canvas state: ${canvasContext}

          Your job:
          - Listen to what the student said and look at their canvas
          - Ask a guiding Socratic question to make them THINK — do NOT give a direct answer unless explicitly explaining a concept when asked
          - If you want to draw something helpful on the canvas (numbered steps, an equation, a diagram label), put ONLY that in "canvas_content" as a short array of lines
          - NEVER put your chat response into "canvas_content" — those are separate
          - "canvas_content" should ONLY appear when there is genuine visual value (e.g. a formula, labeled steps, a diagram key)
          - Keep "response_text" conversational, warm, and under 3 sentences
          - Be encouraging and reference what the student actually said or drew

          Respond ONLY in this exact JSON format:
          {
            "is_struggling": boolean,
            "concept": string,
            "response_text": string,
            "canvas_content": string[] | null
          }`
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

    // 4. Log to Supabase if struggling
    if (result.is_struggling) {
      const studentLabel = studentNameRaw || 'Student';
      const { error } = await supabase.from('interventions').insert([{
        user_id: userIdRaw || null,
        student_name: studentLabel,
        concept: result.concept || parsedSkill?.name || 'General Socratic',
        struggle: transcript,
        skill_id: parsedSkill?.id || null
      }]);

      if (error) console.error("Supabase insert error:", error);
    }

    return NextResponse.json({
      type: "ai_response",
      text: result.response_text || "I'm listening. Tell me more.",
      transcript: transcript,
      canvas_content: result.canvas_content || null
    });

  } catch (error) {
    console.error("Audio API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

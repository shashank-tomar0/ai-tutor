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
          content: `You are Newton, an expert Socratic tutor for all STEM and coding subjects.
          ${skillContext ? `${skillContext}\n` : ''}The student's canvas state is: ${canvasContext}.

          RULES:
          1. Follow the student's lead, but stay anchored in the current skill focus if specified.
          2. Read EVERYTHING on the canvas: text, shapes, diagrams, freehand sketches, equations. Reference what you see specifically.
          3. EXPLAIN concepts clearly when asked direct questions, using analogies and step-by-step logic.
          4. When the student makes a mistake or gets stuck, guide them with Socratic questions — lead them to the "Aha!" breakthrough instead of feeding them direct answers.
          5. Be warm, conversational, patient, and encouraging.

          Determine if they are struggling (frustrated, asking for direct help, or completely wrong).
          If struggling → "is_struggling": true, "concept": topic/skill, "response_text": helpful explanation or guiding question.
          If fine → "is_struggling": false, "concept": topic/skill, "response_text": normal helpful response.

          Respond ONLY in this JSON format:
          {
            "is_struggling": boolean,
            "concept": string,
            "response_text": string
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
      transcript: transcript
    });

  } catch (error) {
    console.error("Audio API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

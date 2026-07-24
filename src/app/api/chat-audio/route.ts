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

    let skillContext = "";
    if (skillRaw) {
      try {
        const skill = JSON.parse(skillRaw);
        skillContext = `Current skill focus: ${skill.name}${skill.description ? ` — ${skill.description}` : ''}`;
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
          content: `You are Newton, an expert Socratic tutor.
          The student's canvas state is: ${canvasContext}.

          The student can draw anything on the canvas — math problems, diagrams, shapes, text, freehand sketches.
          Analyze EVERYTHING on the canvas carefully:
          - Math equations: solve them step-by-step, identify the concept (algebra, geometry, calculus)
          - Diagrams: understand what they're building
          - Shapes + text together: identify what problem the student is working on
          - If the student asks a question or says something, respond directly to it
          - If the student hasn't said anything, observe the canvas and start a Socratic dialogue about what you see
          - If they are struggling or confused, guide them with questions — never give direct answers

          Determine if they are struggling (frustrated, asking for direct help, or completely wrong).
          If they are struggling, set "is_struggling" to true, "concept" to the concept they're working on, and provide a Socratic "response_text" (a guiding question, not an answer).
          If they are doing fine, set "is_struggling" to false and provide an encouraging "response_text".

          Always respond in a warm, helpful tone. Use simple language. Reference what's on the canvas specifically.

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
      const skillId = skillRaw ? JSON.parse(skillRaw).id : null;
      const { error } = await supabase.from('interventions').insert([{
        student_name: 'Student ' + Math.floor(Math.random() * 1000),
        concept: result.concept || 'General',
        struggle: transcript,
        skill_id: skillId
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

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
    const imageBase64 = formData.get('image') as string | null;

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

    // 3. Multimodal vision vs text query
    let userContent: any = `Student says: "${transcript}"`;
    let selectedModel = "llama-3.3-70b-versatile";

    if (imageBase64 && imageBase64.length > 50) {
      selectedModel = "llama-3.2-11b-vision-instruct";
      userContent = [
        { type: "text", text: `Student says: "${transcript}"\nInspect the canvas screenshot for handwriting, drawn diagrams, or math equations.` },
        { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ];
    }

    // 4. Query Groq LLM Socratic Engine
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Newton, an expert AI Socratic Tutor & Canvas Instructor.
          ${skillContext ? `\nCurrent skill focus: ${skillContext}` : ''}
          Canvas state: ${canvasContext}

          Core Rules for Teaching & Canvas:
          1. WHEN A STUDENT ASKS TO LEARN / TEACH / EXPLAIN / DRAW A CONCEPT:
             - IMMEDIATELY teach the concept clearly using BOTH the chat response AND the canvas!
             - ALWAYS populate "canvas_content" with a clean visual breakdown (code syntax, memory diagrams, equations, or numbered steps).
             - In "response_text": Explain the core idea in 1-2 friendly sentences with a real-world analogy, then end with ONE light check question.
          2. WHEN SOLVING AN EXERCISE OR PROBLEM:
             - If they make a mistake or get stuck, ask a guiding Socratic question to help them find their error instead of giving away the final solution.
          3. CANVAS CONTENT FORMAT:
             - "canvas_content" can be strings OR visual shape objects:
               [
                 { "type": "box", "text": "CONCEPT: Variable = Memory Box", "color": "blue" },
                 { "type": "box", "text": "Syntax: int age = 20;", "color": "green" },
                 { "type": "box", "text": "Memory Address 0x7F -> age: 20", "color": "black" },
                 { "type": "note", "text": "💡 TIP: 'int' stores whole numbers without decimals!" }
               ]
             - Or plain string lines: ["Step 1: Identify x", "Step 2: Solve -> x = 5"]
             - NEVER leave "canvas_content" null when the student asks to teach, explain, or draw a concept!

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
          content: userContent
        }
      ],
      model: selectedModel,
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

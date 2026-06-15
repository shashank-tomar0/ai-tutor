import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { transcript, shapes } = await req.json();

    // 1. Summarize the shapes on the canvas for the LLM
    let canvasContext = "The canvas is empty.";
    if (shapes && shapes.length > 0) {
       const textShapes = shapes.filter((s: any) => s.type === 'text');
       if (textShapes.length > 0) {
           canvasContext = `The user has written the following on the canvas: ${textShapes.map((s:any) => s.props.text).join(' ')}`;
       } else {
           canvasContext = `The user has drawn ${shapes.length} shapes on the canvas.`;
       }
    }

    // 2. Query Groq
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are Newton, an expert Socratic tutor. 
          The student's canvas state is: ${canvasContext}.
          
          Analyze the student's message and determine if they are struggling (frustrated, asking for direct help, or completely wrong).
          If they are struggling, set "is_struggling" to true, "concept" to the math concept they are struggling with, and provide a Socratic "response_text".
          If they are doing fine, set "is_struggling" to false and provide a normal encouraging "response_text".
          
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

    // 3. Log to Supabase if struggling
    if (result.is_struggling) {
      const { error } = await supabase.from('interventions').insert([{
        student_name: 'Student ' + Math.floor(Math.random() * 1000),
        concept: result.concept || 'General',
        struggle: transcript
      }]);

      if (error) console.error("Supabase insert error:", error);
    }

    return NextResponse.json({
      type: "ai_response",
      text: result.response_text || "I'm listening. Tell me more."
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
          content: `You are Newton, an expert AI Socratic Tutor & Canvas Instructor.
          ${skillContext ? `\nCurrent skill focus: ${skillContext}` : ''}
          Canvas state summary: ${canvasContext}

          Core Rules for Teaching & Canvas:
          1. WHEN A STUDENT ASKS TO LEARN / TEACH / EXPLAIN / DRAW A CONCEPT:
             - IMMEDIATELY teach the concept clearly using BOTH the chat response AND the canvas!
             - ALWAYS populate "canvas_content" with a clean visual breakdown (code syntax, memory diagrams, equations, or numbered steps).
             - In "response_text": Explain the core idea in 1-2 friendly sentences with a real-world analogy, then end with ONE light check question.
          2. WHEN SOLVING AN EXERCISE OR PROBLEM:
             - If they make a mistake or get stuck, ask a guiding Socratic question to help them find their error instead of giving away the final solution.
          3. CANVAS CONTENT FORMAT (Rich Visual Diagram & Vector Shapes):
             - WHEN ASKED TO DRAW ANYTHING (e.g., a cat, house, tree, flowchart, memory diagram):
               Populate "canvas_content" with a creative multi-shape vector layout using circles, boxes, diamonds, clouds, stars, and arrows!
               Example for "draw a cat":
               [
                 { "type": "circle", "text": "🐱 Cat Head", "color": "orange", "fill": "solid" },
                 { "type": "diamond", "text": "Ear L", "color": "orange", "fill": "semi" },
                 { "type": "box", "text": "Body: Cat Torso", "color": "black", "fill": "semi" },
                 { "type": "arrow", "fromIndex": 0, "toIndex": 2, "label": "neck" },
                 { "type": "note", "text": "💡 Fun Fact: Cats use whiskers to measure openings!" }
               ]
             - Available shape types: "box" (rectangle), "circle" (ellipse), "diamond" (decision/ear), "cloud" (memory/thought), "star" (badge), "note" (yellow tip), "arrow" (connector).
             - Available colors (MUST USE EXACTLY THESE): "blue", "violet", "green", "black", "orange", "red", "yellow", "grey", "light-blue", "light-violet", "light-green", "light-red". (Do NOT use "gray").
             - Available fills: "semi", "solid", "pattern", "none".
             - NEVER leave "canvas_content" null when asked to teach, explain, or draw anything!

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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { parseCanvas } from '@/utils/canvas-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────────────────────────────────────────
// Shared canvas shape instruction (injected into every system prompt)
// ─────────────────────────────────────────────────────────────────────────────
const CANVAS_INSTRUCTION = `
You MUST respond ONLY with valid JSON in this exact format (no markdown, no prose outside JSON):
{
  "is_struggling": false,
  "concept": "Topic name here",
  "response_text": "Your friendly explanation here ending with one Socratic question.",
  "canvas_content": [
    { "type": "box",     "text": "Step 1: ...", "color": "blue",   "fill": "semi"  },
    { "type": "circle",  "text": "Key idea",   "color": "green",  "fill": "semi"  },
    { "type": "diamond", "text": "Decision?",  "color": "orange", "fill": "semi"  },
    { "type": "note",    "text": "💡 Tip ...", "color": "yellow", "fill": "solid" },
    { "type": "arrow",   "text": "leads to",  "color": "violet", "fill": "none"  }
  ]
}

Shape types: "box", "circle", "diamond", "cloud", "star", "note", "arrow"
Colors (ONLY these exact strings): "blue","violet","green","black","orange","red","yellow","grey","light-blue","light-violet","light-green","light-red"
Fills: "semi", "solid", "pattern", "none"
NEVER use "gray" — use "grey". NEVER return null for canvas_content when teaching or solving.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Robust JSON extractor — handles markdown fences and nested objects
// ─────────────────────────────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  // Strip markdown code fences
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();

  // Try direct parse
  try { return JSON.parse(stripped); } catch {}

  // Find the outermost balanced {} block
  const start = stripped.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    else if (stripped[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(stripped.slice(start, i + 1)); } catch {}
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile    = formData.get('file')         as File   | null;
    const textDirect   = formData.get('text')         as string | null;
    const shapesRaw    = formData.get('shapes')       as string;
    const skillRaw     = formData.get('skill')        as string;
    const userIdRaw    = formData.get('user_id')      as string | null;
    const studentNameRaw = formData.get('student_name') as string | null;
    const imageBase64  = formData.get('image')        as string | null;

    // ── Skill context ─────────────────────────────────────────────────────────
    let skillContext = '';
    let parsedSkill: any = null;
    if (skillRaw) {
      try {
        parsedSkill = JSON.parse(skillRaw);
        if (parsedSkill?.name) {
          skillContext = `Current skill focus: ${parsedSkill.name}${parsedSkill.description ? ` — ${parsedSkill.description}` : ''}`;
        }
      } catch {}
    }

    // ── Transcribe audio if needed ────────────────────────────────────────────
    let transcript = '';
    if (textDirect) {
      transcript = textDirect;
    } else if (audioFile) {
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'json',
      });
      transcript = transcription.text;
    } else {
      return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 });
    }

    if (!transcript || transcript.trim() === '') {
      return NextResponse.json({
        type: 'ai_response',
        text: "I didn't quite catch that. Could you speak up or type your message?",
        transcript: '',
      });
    }

    // ── Canvas context ────────────────────────────────────────────────────────
    let parsedShapes: unknown[] = [];
    try { parsedShapes = JSON.parse(shapesRaw); } catch {}
    const canvasContext = parseCanvas(parsedShapes);

    // ═════════════════════════════════════════════════════════════════════════
    // HANDWRITING PATH — two-phase: OCR then JSON
    // ═════════════════════════════════════════════════════════════════════════
    if (imageBase64 && imageBase64.length > 50) {
      
      // DEBUG: save image to disk to see what the API receives
      try {
        const fs = require('fs');
        fs.writeFileSync('./debug-ocr-image.png', Buffer.from(imageBase64, 'base64'));
      } catch (e) {}

      // PHASE 1 — High-Accuracy Vision OCR (OpenRouter gpt-4o-mini or Groq qwen)
      let ocrText = '';
      const openRouterKey = process.env.OPENROUTER_API_KEY;

      if (openRouterKey && openRouterKey.startsWith('sk-or-')) {
        try {
          const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openRouterKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'openai/gpt-4o-mini',
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'You are an OCR system. Read the handwritten equation, math problem, code, or diagram in this image carefully. Output ONLY the raw equation or text visible in the drawing. Do NOT add intro text, markdown fences, or sentences. Simply transcribe what you see.' },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                  ]
                }
              ],
              max_tokens: 256,
            }),
          });
          if (openRouterRes.ok) {
            const orData = await openRouterRes.json();
            ocrText = orData.choices?.[0]?.message?.content?.trim() || '';
          }
        } catch (orErr: any) {
          console.warn('OpenRouter OCR failed, falling back to Groq:', orErr?.message || orErr);
        }
      }

      if (!ocrText) {
        try {
          const ocrCompletion = await groq.chat.completions.create({
            model: 'qwen/qwen3.6-27b',
            messages: [
              {
                role: 'system',
                content: 'You are a strict OCR reader. Output ONLY the raw handwritten characters or math equation drawn in ink. Do NOT write intro sentences, meta comments, or any examples. Transcribe exactly what is in the image.',
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Output ONLY the handwritten equation or text:' },
                  { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } },
                ] as any,
              },
            ],
            max_tokens: 256,
          });
          let rawOcr = ocrCompletion.choices[0]?.message?.content?.trim() || '';
          ocrText = rawOcr.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/<\/?think>/gi, '').trim();
        } catch (ocrErr: any) {
          console.error('Groq OCR phase failed:', ocrErr?.message || ocrErr);
        }
      }

      // Clean filler text if any remained
      let cleaned = (ocrText || '')
        .split('\n')
        .filter(line => {
          const l = line.toLowerCase();
          return !(
            l.includes('the user wants') ||
            l.includes('the image shows') ||
            l.includes('the image is') ||
            l.includes('transcribe the text') ||
            l.includes('provided image') ||
            l.includes('no text is visible') ||
            l.includes('there is no text') ||
            l.includes('empty image') ||
            l.includes('read and solve the handwritten')
          );
        })
        .join('\n')
        .trim();

      ocrText = cleaned || transcript || 'Handwritten Equation/Question';

      console.log('OCR result:', ocrText);

      // PHASE 2 — llama text model: solve OCR text → structured canvas JSON
      const solvePrompt = `The student wrote the following mathematical equation or question by hand:\n"${ocrText}"\n\nSkill context: ${skillContext || 'General'}\nCanvas state: ${canvasContext}\n\nSolve this equation or problem directly and completely, step-by-step. Provide the clear final answer.\nIn "canvas_content", create visual step cards (e.g. Card 1: Equation / Given, Card 2: Step-by-step operations, Card 3: Final Answer box).\nDo NOT write meta observations or filler commentary. Focus purely on solving the handwritten problem directly.`;

      const solveCompletion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: `You are Newton, an expert AI tutor.\n${CANVAS_INSTRUCTION}` },
          { role: 'user',   content: solvePrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500,
      });

      const rawSolve = solveCompletion.choices[0]?.message?.content || '{}';
      const result = extractJSON(rawSolve) || {
        is_struggling: false,
        concept: 'Handwriting OCR',
        response_text: `I read: "${ocrText}". Here is the solution!`,
        canvas_content: null,
      };

      // Log struggle
      if (result.is_struggling && userIdRaw) {
        await supabase.from('interventions').insert([{
          user_id: userIdRaw,
          student_name: studentNameRaw || 'Student',
          concept: result.concept || parsedSkill?.name || 'Handwriting',
          struggle: ocrText,
          skill_id: parsedSkill?.id || null,
        }]).then(({ error }) => { if (error) console.error('Supabase error:', error); });
      }

      return NextResponse.json({
        type: 'ai_response',
        text: result.response_text || `I read your handwriting: "${ocrText}"`,
        transcript: ocrText,
        canvas_content: result.canvas_content || null,
      });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // NORMAL TEXT / AUDIO PATH — single llama call with json_object
    // ═════════════════════════════════════════════════════════════════════════
    const systemPrompt = `You are Newton, an expert AI Socratic Tutor & Canvas Instructor.
${skillContext ? `\nSkill focus: ${skillContext}` : ''}
Canvas state: ${canvasContext}

Rules:
1. ALWAYS populate canvas_content with visual shape cards when teaching or explaining.
2. In response_text: explain in 1-2 sentences with a real-world analogy, end with ONE Socratic question.
3. If student is stuck or wrong, guide them with a question — do not give away the answer.
${CANVAS_INSTRUCTION}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: `Student says: "${transcript}"` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const result = extractJSON(rawContent) || {
      is_struggling: false,
      concept: 'General',
      response_text: "I'm listening. Tell me more.",
      canvas_content: null,
    };

    // Log struggle
    if (result.is_struggling) {
      await supabase.from('interventions').insert([{
        user_id: userIdRaw || null,
        student_name: studentNameRaw || 'Student',
        concept: result.concept || parsedSkill?.name || 'General Socratic',
        struggle: transcript,
        skill_id: parsedSkill?.id || null,
      }]).then(({ error }) => { if (error) console.error('Supabase error:', error); });
    }

    return NextResponse.json({
      type: 'ai_response',
      text: result.response_text || "I'm listening. Tell me more.",
      transcript,
      canvas_content: result.canvas_content || null,
    });

  } catch (error: any) {
    console.error('Audio API error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal Server Error', detail: error?.message || String(error) },
      { status: 500 }
    );
  }
}

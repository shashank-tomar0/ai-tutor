import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { getOpenRouterKey } from '@/utils/server-env';

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
    const canvasImage = formData.get('canvasImage') as string | null;

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

    // 2. Build the canvas context. Prefer an actual image (vision) over a text summary
    //    so the tutor can read handwriting, equations and diagrams — not just typed text.
    let shapes = [];
    try { shapes = JSON.parse(shapesRaw); } catch(e) {}

    const useVision = !!canvasImage;

    let canvasContext = "The canvas is empty.";
    if (!useVision && shapes && shapes.length > 0) {
       const textShapes = shapes.filter((s: any) => s.type === 'text');
       if (textShapes.length > 0) {
           canvasContext = `The user has written the following on the canvas: ${textShapes.map((s:any) => s.props.text).join(' ')}`;
       } else {
           canvasContext = `The user has drawn ${shapes.length} shapes on the canvas.`;
       }
    }

    // 3. Query the Socratic engine. With a canvas image we use an OpenRouter vision
    //    model (Gemini) so Newton can actually SEE what the student wrote/drew.
    const systemPrompt = useVision
      ? `You are Newton, an expert Socratic math tutor. An IMAGE of the student's whiteboard is attached.
Carefully READ everything on it — handwriting, equations, diagrams, and typed text.
${skillContext ? skillContext + '.' : ''}

First understand what the student has written or drawn. Then decide if they are struggling
(a mistake, an incomplete step, confusion, or they asked for the answer directly).
NEVER give the final answer outright — guide them with one focused Socratic question toward the next step.

Respond ONLY in this JSON format:
{
  "is_struggling": boolean,
  "concept": string,
  "canvas_summary": string,
  "response_text": string
}
Where "canvas_summary" is one short sentence describing what you see on the canvas, and
"response_text" is your spoken Socratic reply that references what they actually wrote.
Keep "response_text" to at most 2 short sentences — it is spoken aloud via TTS.`
      : `You are Newton, an expert Socratic tutor.
          The student's canvas state is: ${canvasContext}.
          ${skillContext ? skillContext + '.' : ''}

          Analyze the student's message and determine if they are struggling (frustrated, asking for direct help, or completely wrong).
          If they are struggling, set "is_struggling" to true, "concept" to the math concept they are struggling with, and provide a Socratic "response_text".
          If they are doing fine, set "is_struggling" to false and provide a normal encouraging "response_text".
          Keep "response_text" to at most 2 short sentences — it is spoken aloud via TTS.

          Respond ONLY in this JSON format:
          {
            "is_struggling": boolean,
            "concept": string,
            "response_text": string
          }`;

    const userContent: any = useVision
      ? [
          { type: 'text', text: `Student says: "${transcript}"` },
          { type: 'image_url', image_url: { url: canvasImage } },
        ]
      : `Student says: "${transcript}"`;

    const messages: any = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ];

    let rawContent = '{}';

    if (useVision) {
      // Vision path: Groq's hosted models don't reliably read handwriting/diagrams
      // (and Llama-4 vision isn't available on every key), so we use OpenRouter's
      // Gemini, which reads whiteboard math and drawings accurately.
      const orKey = getOpenRouterKey();
      if (!orKey) {
        return NextResponse.json({
          type: "ai_response",
          text: "I can't see the canvas right now — the vision service isn't configured.",
          transcript
        });
      }

      const callGemini = (withJsonMode: boolean) => fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages,
          ...(withJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });

      let orResp = await callGemini(true);
      if (!orResp.ok) {
        // Retry once without JSON mode in case the provider rejects it.
        console.warn("Gemini vision json_object mode failed, retrying:", orResp.status);
        orResp = await callGemini(false);
      }
      if (!orResp.ok) {
        console.error("OpenRouter vision error:", orResp.status, await orResp.text());
        return NextResponse.json({
          type: "ai_response",
          text: "I had trouble reading your canvas just now. Could you try again?",
          transcript
        });
      }
      const orData = await orResp.json();
      rawContent = orData.choices?.[0]?.message?.content || '{}';
    } else {
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });
      rawContent = completion.choices[0]?.message?.content || '{}';
    }
    let result: any = {};
    try {
      result = JSON.parse(rawContent);
    } catch {
      // Model may wrap JSON in prose — extract the first {...} block.
      const match = rawContent.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : {};
    }

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
      canvas_summary: result.canvas_summary || null,
      is_struggling: result.is_struggling ?? null,
      transcript: transcript
    });

  } catch (error) {
    console.error("Audio API error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, voice = 'alloy' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text input is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ fallback: true, text }, { status: 200 });
    }

    const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://projectnewton.ai',
        'X-Title': 'Project Newton AI Tutor',
      },
      body: JSON.stringify({
        model: 'openai/tts-1',
        input: text,
        voice: voice,
      }),
    });

    if (!response.ok) {
      console.warn(`OpenRouter TTS response error: ${response.statusText}`);
      return NextResponse.json({ fallback: true, text }, { status: 200 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json({ fallback: true }, { status: 200 });
  }
}

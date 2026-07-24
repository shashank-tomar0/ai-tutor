import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://github.com/shashank-tomar0/ai-tutor',
    'X-Title': 'Newton AI Tutor',
  },
});

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter key not configured', fallback: true }, { status: 200 });
    }

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Use OpenAI TTS via OpenRouter
    // Models available: tts-1 (faster, cheaper) or tts-1-hd (higher quality)
    const model = voiceId === 'hd' ? 'tts-1-hd' : 'tts-1';
    const voice = voiceId === 'nova' ? 'nova' :
                  voiceId === 'shimmer' ? 'shimmer' :
                  voiceId === 'echo' ? 'echo' :
                  voiceId === 'fable' ? 'fable' :
                  voiceId === 'onyx' ? 'onyx' : 'alloy';

    const response = await openrouter.audio.speech.create({
      model: model,
      voice: voice,
      input: text,
      response_format: 'mp3',
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await response.arrayBuffer());

    return new Response(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: any) {
    console.error('OpenRouter TTS error:', error?.message || error);
    // Signal fallback to browser SpeechSynthesis
    return NextResponse.json({ error: 'TTS service error', fallback: true }, { status: 200 });
  }
}

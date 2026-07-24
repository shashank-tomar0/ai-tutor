import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text || text.trim() === '') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Strategy 1: Try OpenRouter TTS (OpenAI-compatible endpoint)
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/shashank-tomar0/ai-tutor',
            'X-Title': 'Newton AI Tutor',
          },
          body: JSON.stringify({
            model: 'openai/tts-1',
            voice: 'alloy',
            input: text,
            response_format: 'mp3',
          }),
        });

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          if (audioBuffer.byteLength > 0) {
            return new Response(audioBuffer, {
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.byteLength.toString(),
              },
            });
          }
        }
        console.warn('OpenRouter TTS failed:', response.status, await response.text().catch(() => ''));
      } catch (e: any) {
        console.warn('OpenRouter TTS error:', e?.message);
      }
    }

    // Strategy 2: Try Groq TTS (Whisper can't do TTS, so skip)
    // Strategy 3: Signal fallback to browser SpeechSynthesis
    return NextResponse.json({
      error: 'TTS not available',
      fallback: true,
      // Return the text so the client can use browser speech
      text: text,
    }, { status: 200 });

  } catch (error: any) {
    console.error('TTS route error:', error?.message);
    return NextResponse.json({ error: 'Internal server error', fallback: true }, { status: 200 });
  }
}

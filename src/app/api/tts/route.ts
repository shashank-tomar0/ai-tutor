import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL' } = await req.json();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured', fallback: true }, { status: 200 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs API returned error:', errText);
      return NextResponse.json({ error: 'ElevenLabs API error', fallback: true }, { status: 200 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error in TTS route:', error);
    return NextResponse.json({ error: 'Internal server error', fallback: true }, { status: 200 });
  }
}

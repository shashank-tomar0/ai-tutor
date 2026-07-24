import { NextResponse } from 'next/server';
import { getOpenRouterKey } from '@/utils/server-env';

// OpenRouter's OpenAI-compatible text-to-speech endpoint.
const OPENROUTER_TTS_URL = 'https://openrouter.ai/api/v1/audio/speech';
const TTS_MODEL = 'google/gemini-3.1-flash-tts-preview';
// Gemini prebuilt voices: Kore (firm/clear), Charon (informative), Puck (upbeat),
// Zephyr (bright), Sulafat (warm), Aoede (breezy). See model page for the full list.
const DEFAULT_VOICE = 'Kore';

/**
 * Gemini TTS only returns headerless signed-16-bit little-endian PCM
 * (response_format="pcm"). Browsers can't play raw PCM via <audio>, so we
 * prepend a minimal 44-byte WAV/RIFF header and serve it as audio/wav.
 */
function pcmToWav(pcm: ArrayBuffer, sampleRate: number, channels: number): ArrayBuffer {
  const bitsPerSample = 16;
  const dataLength = pcm.byteLength;
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;

  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true); // ChunkSize
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true); // Subchunk2Size

  new Uint8Array(buffer, 44).set(new Uint8Array(pcm));
  return buffer;
}

export async function POST(req: Request) {
  try {
    const { text, voice = DEFAULT_VOICE } = await req.json();

    const apiKey = getOpenRouterKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured', fallback: true }, { status: 200 });
    }
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: 'No text provided', fallback: true }, { status: 200 });
    }

    const response = await fetch(OPENROUTER_TTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: text,
        voice,
        response_format: 'pcm', // Gemini TTS supports pcm only (not mp3)
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter TTS returned error:', response.status, errText);
      return NextResponse.json({ error: 'OpenRouter TTS error', fallback: true }, { status: 200 });
    }

    // Rate/channels are carried on the content-type, e.g. "audio/pcm;rate=24000;channels=1".
    const contentType = response.headers.get('content-type') || '';
    const sampleRate = parseInt(contentType.match(/rate=(\d+)/)?.[1] || '24000', 10);
    const channels = parseInt(contentType.match(/channels=(\d+)/)?.[1] || '1', 10);

    const pcm = await response.arrayBuffer();
    const wav = pcmToWav(pcm, sampleRate, channels);

    return new Response(wav, {
      headers: {
        'Content-Type': 'audio/wav',
      },
    });
  } catch (error) {
    console.error('Error in TTS route:', error);
    return NextResponse.json({ error: 'Internal server error', fallback: true }, { status: 200 });
  }
}

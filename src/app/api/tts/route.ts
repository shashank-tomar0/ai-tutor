import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // This endpoint is kept for future use with cloud TTS.
  // Currently, all TTS is handled by the browser's native SpeechSynthesis
  // which provides free, high-quality voices (David, Zira, Google, etc.)
  // without any API keys or latency.
  return NextResponse.json({ fallback: true, text: '' }, { status: 200 });
}

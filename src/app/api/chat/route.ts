import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: Request) {
  try {
    const { transcript, shapes } = await req.json();
    
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy" });

    let reply = "I'm listening. Tell me more about what you're drawing.";
    
    // Only call Groq if we have a real key configured
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_key_here") {
      const response = await groq.chat.completions.create({
        messages: [
          { 
            role: "system", 
            content: "You are Newton, an omniscient Socratic tutor. Keep your answers extremely short (1-2 sentences). Be encouraging. Never give the direct answer, guide the student to the Aha moment. You can 'see' the user's canvas shapes passed in the context." 
          },
          { 
            role: "user", 
            content: `Student says: "${transcript}"\nCanvas State: ${JSON.stringify(shapes)}` 
          }
        ],
        model: "llama-3.3-70b-versatile",
      });
      reply = response.choices[0]?.message?.content || reply;
    } else {
        // Fallback for UI testing
        if (transcript.toLowerCase().includes("hello")) {
            reply = "Hello! I am the Next.js port of Newton. I can hear you clearly!";
        }
    }

    return NextResponse.json({ type: "ai_response", text: reply });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ type: "error", message: "Failed to process chat" }, { status: 500 });
  }
}

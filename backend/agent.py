import os
import json
import logging
import asyncio
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, silero
from groq import AsyncGroq

load_dotenv()
logger = logging.getLogger("ai-tutor-agent")
logger.setLevel(logging.INFO)

async def entrypoint(ctx: JobContext):
    # Setup initial context
    initial_ctx = llm.ChatContext().append(
        role="system",
        text=(
            "You are Project Newton, an omniscient, real-time cognitive co-pilot. "
            "Your goal is to guide the student using Socratic dialogue. "
            "Do not give them the direct answer. Ask guiding questions based on "
            "their verbal input and the data from their digital canvas."
        ),
    )

    # Connect to the LiveKit room
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # Initialize the Voice Assistant
    assistant = VoiceAssistant(
        vad=silero.VAD.load(),
        stt=openai.STT(),
        llm=openai.LLM(),
        tts=openai.TTS(),
        chat_ctx=initial_ctx,
    )

    # Start the assistant in the room
    assistant.start(ctx.room)

    # Initialize the Groq reasoning client
    groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

    async def analyze_canvas_with_groq(shapes):
        try:
            logger.info("Sending canvas to Groq (DeepSeek-R1) for reasoning...")
            response = await groq_client.chat.completions.create(
                model="deepseek-r1-distill-llama-70b",
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a math tutor's internal logic verification engine. You will be given a JSON representation of a student's whiteboard canvas. Look for any mathematical errors in the text or equations. If there is an error, respond ONLY with a concise hint for the tutor to use. If it is correct, respond ONLY with 'CORRECT'."
                    },
                    {
                        "role": "user", 
                        "content": json.dumps(shapes)
                    }
                ],
                temperature=0.1,
                max_tokens=150
            )
            hint = response.choices[0].message.content
            if "CORRECT" not in hint:
                logger.info(f"Groq detected an error: {hint}")
                assistant.chat_ctx.append(
                    role="system",
                    text=f"CRITICAL REASONING UPDATE from internal engine: An error was just detected on the board. Use this hint to guide the student: {hint}"
                )
        except Exception as e:
            logger.error(f"Groq reasoning error: {e}")
    
    # Listen for Data Channel messages from the frontend (the canvas state)
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
            if payload.get("type") == "canvas_sync":
                shapes = payload.get("shapes", [])
                logger.info(f"Received canvas sync with {len(shapes)} shapes.")
                
                # Standard context append for general awareness
                assistant.chat_ctx.append(
                    role="system",
                    text=f"The student's canvas currently contains the following items: {json.dumps(shapes)}"
                )

                # Fire off the heavy reasoning engine asynchronously
                if len(shapes) > 0:
                    asyncio.create_task(analyze_canvas_with_groq(shapes))

        except Exception as e:
            logger.error(f"Error parsing data channel message: {e}")

    await assistant.say("Hello! I'm Newton. I can see your canvas. What are we working on today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

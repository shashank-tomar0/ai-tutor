import os
import json
import logging
from dotenv import load_dotenv

from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.voice_assistant import VoiceAssistant
from livekit.plugins import openai, silero

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
    
    # Listen for Data Channel messages from the frontend (the canvas state)
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode("utf-8"))
            if payload.get("type") == "canvas_sync":
                shapes = payload.get("shapes", [])
                logger.info(f"Received canvas sync with {len(shapes)} shapes.")
                # We append this context invisibly to the LLM's thought process
                # so it "knows" what is on the board without reading it aloud.
                assistant.chat_ctx.append(
                    role="system",
                    text=f"The student's canvas currently contains the following items: {json.dumps(shapes)}"
                )
        except Exception as e:
            logger.error(f"Error parsing data channel message: {e}")

    await assistant.say("Hello! I'm Newton. I can see your canvas. What are we working on today?", allow_interruptions=True)

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

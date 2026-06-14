# Project Newton: The Cognitive AI Tutor

![Newton Banner](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop)

Project Newton is a venture-grade, dual-core AI tutoring application. It is the world's first **Socratic AI co-pilot** that seamlessly merges real-time auditory reasoning with spatial awareness of a digital whiteboard.

It does not give answers; it guides students to the "Aha!" moment.

## 🚀 Architecture

Newton has been fully ported to a modern **Full-Stack Next.js (App Router)** architecture.

*   **Frontend Framework:** Next.js 14, React, Tailwind CSS
*   **3D Interactive Engine:** Three.js, React Three Fiber, Framer Motion
*   **Canvas/Whiteboard:** Tldraw (provides a collaborative whiteboard interface)
*   **Speech Engine:** Browser-native Web Speech API (100% free STT and TTS without latency)
*   **Reasoning Core:** Groq Llama-3.3-70b-versatile via Node.js SDK
*   **Data Layer:** Next.js API Routes (formerly Python FastAPI)

### Why this architecture?
By abandoning expensive, high-latency LiveKit environments, we built a 100% free, browser-native Web Speech interface. Next.js handles both the premium 3D landing pages and the cognitive API routing to Groq, meaning you can deploy the entire platform to Vercel in one click.

## 🛠️ Prerequisites & Installation

### 1. Environment Variables
Copy the example environment file:
```bash
cp .env.example .env.local
```
Inside `.env.local`, configure your active Groq API Key:
```text
GROQ_API_KEY=gsk_your_real_key_here
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🎓 Core Features

### 1. The Sensory Canvas (`/classroom`)
Students enter an infinite digital whiteboard where they can draw math problems, wireframes, or diagrams. Newton listens to their voice while actively "seeing" the JSON structure of the shapes drawn on the canvas. 
*   **To test:** Open the classroom, draw a triangle, turn on the microphone, and ask "Newton, what's wrong with the angles of my shape?"

### 2. Teacher Dashboard (`/dashboard`)
A beautiful, dark-mode B2B interface where teachers can monitor the "Cognitive Health" of their classrooms.
*   **Class Concept Mastery:** Live heatmaps of struggling topics vs mastered concepts.
*   **Intervention Feed:** Real-time stream of students currently stuck on a problem and the specific Socratic prompt Newton is using to unblock them.

### 3. Aha! Replays (`/replay`)
Every time Newton detects a cognitive breakthrough, the entire session (voice + DOM mutations via `rrweb`) is serialized. Teachers can review these breakthroughs to understand *how* a student learns best.

## 🧠 The "Socratic" Prompt Engineering
Newton's core AI loop is engineered to strictly avoid direct answers. The Groq reasoning engine analyzes the student's verbal request overlaid against the Tldraw spatial canvas JSON. It uses a custom prompt system to isolate the student's point of friction and return a leading question. 

* * *

*Built with ❤️ for the future of EdTech.*

<p align="center">
  <img src="newton-architecture.svg" alt="Newton AI Tutor" width="80" height="80" />
</p>

<h1 align="center">Project Newton</h1>

<p align="center">
  <em>Open-source Socratic AI tutor with real-time voice and spatial canvas intelligence</em>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-1a1a2e?style=for-the-badge" alt="Quick Start"></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/Architecture-1a1a2e?style=for-the-badge" alt="Architecture"></a>
  <a href="PRD.md"><img src="https://img.shields.io/badge/PRD-1a1a2e?style=for-the-badge" alt="PRD"></a>
  <a href="public/newton-architecture.excalidraw"><img src="https://img.shields.io/badge/Excalidraw%20Diagram-1a1a2e?style=for-the-badge" alt="Excalidraw Diagram"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tldraw_5-000?style=flat-square&logo=tldraw" alt="Tldraw v5" />
  <img src="https://img.shields.io/badge/Groq_Llama_3.3_70B-f97316?style=flat-square" alt="Groq Llama 3.3 70B" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" />
</p>

---

## Overview

Newton is an open-source AI tutoring platform that combines a digital whiteboard, real-time voice interaction, and a Socratic reasoning engine to help students learn by thinking -- not by receiving answers.

Unlike chatbot-only tutors, Newton sees what students draw, hears what they say, and responds with guiding questions that build understanding rather than providing answers. It includes a teacher dashboard for classroom monitoring and full session replay for breakthrough analysis.

---

## Architecture

<p align="center">
  <img src="newton-architecture.svg" alt="Newton System Architecture Diagram" width="100%" />
</p>

| Layer | Components |
|-------|-----------|
| **Client** | Next.js 16, React 19, Tldraw v5 Canvas, ChatSidebar, CaptionsBar, rrweb, Web Speech API, VAD Analyzer, Recharts |
| **API** | POST /api/chat-audio, POST /api/chat, GET /api/skills, GET /api/skills/recommendations, POST /api/skills/update |
| **LLM** | Groq Llama-3.3-70b (Socratic Engine), Groq Whisper (STT), Browser SpeechSynthesis (TTS) |
| **Data** | Supabase: Auth, user_profiles, session_replays, interventions, skills, user_skills, skill_prerequisites |

> Interactive version: [`public/newton-architecture.excalidraw`](public/newton-architecture.excalidraw) -- open with [excalidraw.com](https://excalidraw.com).

---

## Quick Start

```bash
git clone https://github.com/shashank-tomar0/ai-tutor.git
cd ai-tutor
npm install
```

Create `.env.local`:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Run `supabase_schema.sql` in your Supabase SQL Editor, then:

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Features

### Classroom (`/classroom`)
An infinite canvas where students draw, write, and talk. The AI reads all shapes, text, and diagrams on the canvas in real-time, responds in the chat sidebar, writes explanations onto the canvas as text shapes, and speaks the response via browser TTS with animated captions.

### Teacher Dashboard (`/dashboard`)
Real-time view of student struggles organized by concept, with live intervention feed and full session replay playback.

### Aha! Replays (`/replay/[id]`)
Every canvas session is recorded via rrweb and stored in Supabase. Teachers can replay the exact moment a breakthrough happened and leave feedback.

### Session Replay (`/replay`)
Upload locally-downloaded JSON replay files for playback if the database connection is unavailable.

---

## Project Structure

```
src/
  app/
    page.tsx                   Landing page
    layout.tsx                 Root layout with fonts
    classroom/page.tsx         Canvas + Chat + Voice + Captions
    dashboard/page.tsx         Teacher analytics
    login/page.tsx             Supabase Auth
    login/role-select/page.tsx Student / Teacher role picker
    replay/page.tsx            Local replay viewer
    replay/[id]/page.tsx       Cloud replay + feedback
    api/
      chat/route.ts            Text + canvas to Groq
      chat-audio/route.ts      Voice + canvas to Groq
      skills/route.ts          Skill tree endpoint
      skills/recommendations/route.ts
      skills/update/route.ts
      dashboard/struggling/route.ts
      dashboard/heatmap/route.ts
  components/
    ChatSidebar.tsx            Message panel + controls
    CaptionsBar.tsx            Speech captions overlay
  utils/
    supabase.ts                Supabase client
    skill-engine.ts            Mastery algorithm
    canvas-parser.ts           Shape detection engine
```

---

## How the Socratic Engine Works

Student input (voice or text) plus canvas shapes are sent to Groq Llama-3.3-70b with JSON schema enforcement. The model returns `{ is_struggling, concept, response_text }`. The response appears as a chat message, a text shape on the canvas, and spoken audio with captions. Struggling events are logged to Supabase and pushed to the teacher dashboard in real-time.

The canvas parser detects text, geometric shapes, arrows, lines, freehand strokes, and higher-level structures like math equations, coordinate planes, tables, and flowcharts.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| Next.js 16 | Full-stack framework, App Router, API routes |
| React 19 | UI library |
| Tailwind CSS | Styling |
| Tldraw v5 | Infinite whiteboard canvas |
| Groq Llama-3.3-70b | Socratic LLM inference (800+ tok/s) |
| Groq Whisper | Speech-to-text transcription |
| Web Speech API | Free browser-based TTS |
| Supabase | Auth, PostgreSQL, Realtime subscriptions |
| rrweb | DOM session recording |
| Recharts | Dashboard charts |
| Framer Motion | Animations |

---

## Roadmap

### Shipped (v1.0)
- Socratic Engine with canvas context
- Tldraw v5 infinite canvas
- Voice VAD + Groq Whisper STT
- Browser SpeechSynthesis TTS
- ChatSidebar + CaptionsBar
- AI writes to canvas
- Teacher Dashboard (heatmap, interventions, replays)
- rrweb session replay + teacher feedback
- Supabase Auth + RBAC
- Adaptive skill tree (30+ skills, prerequisites, mastery)
- Canvas Parser (shape/geometry/math detection)
- Comprehensive PRD

### Upcoming (Tier 1)
- Connect real DB to dashboard APIs
- Student Progress Dashboard (streaks, timeline, badges)
- Session Summary Modal on session end
- Multi-subject skill trees (Physics, Chemistry, Biology, CS)
- Real user names in interventions

### Upcoming (Tier 2)
- Multiplayer classroom (Yjs + Tldraw sync)
- Dark mode + accessibility
- Parent portal with weekly digest
- Curriculum alignment (Common Core, CBSE, GCSE)

### Upcoming (Tier 3)
- LMS integrations (Google Classroom, Canvas)
- Offline-first PWA with IndexedDB
- Mobile native (React Native / Expo)
- Fine-tuned Socratic model (self-hosted)
- Enterprise admin dashboard

### God-Level Upgrades
1. Multimodal Canvas Vision -- send PNG snapshots + shape JSON to Gemini 2.0 Flash Vision for handwritten math and hand-drawn diagram understanding
2. Low-Latency Voice Pipeline -- streaming WebSocket audio with Cartesia or Deepgram
3. Interactive AI Canvas Generator -- AI draws geometry, plots function graphs, highlights mistakes
4. Audio-Synchronized Replays -- WebRTC audio synced frame-by-frame with rrweb DOM playback
5. Multiplayer Socratic Classroom -- Tldraw collaborative sync via Yjs with live teacher spectating
6. Gamified 3D Knowledge Graph -- Three.js skill constellation with mastery node particle beams

---

## Contributing

[Open an issue](https://github.com/shashank-tomar0/ai-tutor/issues) or start a discussion. The PRD lists all planned features.

```bash
npm run dev       # Development server
npm run build     # Production build
npm run lint      # Code quality
```

---

## License

MIT
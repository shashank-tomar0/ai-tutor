<p align="center">
  <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop" alt="Newton AI Tutor Banner" width="100%" />
</p>

<h1 align="center">Project Newton</h1>

<p align="center">
  <em>An open-source Socratic AI tutor with real-time voice interaction and spatial canvas intelligence</em>
</p>

<p align="center">
  <a href="#quick-start"><img src="https://img.shields.io/badge/Quick%20Start-1a1a2e?style=for-the-badge" alt="Quick Start"></a>
  <a href="#architecture"><img src="https://img.shields.io/badge/Architecture-1a1a2e?style=for-the-badge" alt="Architecture"></a>
  <a href="PRD.md"><img src="https://img.shields.io/badge/Full%20PRD-1a1a2e?style=for-the-badge" alt="Full PRD"></a>
  <a href="public/newton-architecture.excalidraw"><img src="https://img.shields.io/badge/Excalidraw%20Diagram-1a1a2e?style=for-the-badge" alt="Excalidraw Diagram"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Tldraw_5-000000?style=flat-square&logo=tldraw" alt="Tldraw v5" />
  <img src="https://img.shields.io/badge/Groq_Llama_3.3_70B-f97316?style=flat-square" alt="Groq Llama 3.3 70B" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/rrweb-FF6B6B?style=flat-square" alt="rrweb" />
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT License" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Newton is a venture-grade, open-source AI tutoring platform that merges real-time voice interaction with a spatial digital canvas. It is built for students who need more than a chatbot -- they need a thinking partner that sees what they draw, hears what they say, and asks the right question to unlock understanding.

Unlike every other open-source AI tutor, Newton is not a CLI tool or a chat widget. It is a complete spatial learning environment:

- **Voice-first interaction.** Browser-native speech recognition and synthesis that costs nothing and requires no infrastructure.
- **Infinite whiteboard canvas.** Students draw math problems, diagrams, or code. The AI reads every shape, text label, arrow, and freehand stroke in real-time.
- **Socratic by design.** The AI is prompted to never hand out answers. It guides students with questions, explanations, and analogies.
- **Teacher visibility.** A live dashboard shows real-time student struggles, concept mastery heatmaps, and full session replays with playback controls.
- **Session replay.** Every canvas interaction is recorded via rrweb and stored in Supabase. Teachers can replay the exact moment a breakthrough happened and leave feedback.

The platform was designed in response to the June 2026 Stanford study that found giving students access to AI tutors does not guarantee usage. Newton solves this by combining voice, vision, and Socratic method into a single integrated experience, with a full teacher observation layer built in from day one.

---

## Architecture

<p align="center">
  <img src="newton-architecture.svg" alt="Newton System Architecture Diagram" width="100%" />
</p>

The system is organized into four layers that run entirely within a single Next.js codebase, deployable to Vercel in one click.

### Client Layer (Browser)
The frontend runs Next.js 16 with React 19 and Tailwind CSS. Students interact through a Tldraw v5 infinite whiteboard, a chat sidebar for text conversations, animated captions that display AI speech in real-time, and voice controls powered by the browser-native Web Speech API. A voice activity detector analyzes microphone input and triggers Groq Whisper transcription when speech is detected. All DOM interactions are recorded by rrweb for later replay.

### API Layer (Next.js Route Handlers)
Server-side routes handle text and voice chat, canvas context injection into LLM prompts, skill tree queries, mastery updates, recommendation generation, and dashboard analytics. Every route is a standard Next.js App Router handler.

### LLM and AI Inference Layer
Groq Llama-3.3-70b serves as the core Socratic engine. It receives the student's message together with a structured description of all shapes, text, and diagrams on the canvas, and returns a JSON response containing the struggle classification, the concept being worked on, and the response text. Groq Whisper handles speech-to-text transcription. Browser SpeechSynthesis provides free TTS with no API key required. A custom Canvas Parser engine analyzes canvas shapes before they reach the LLM, detecting geometry, math equations, coordinate planes, flowcharts, and freehand sketches.

### Data Layer (Supabase)
Supabase provides authentication via Google OAuth and email, a PostgreSQL database for user profiles, session replays, interventions, and the adaptive skill tree, and Realtime subscriptions that push live updates to the teacher dashboard.

---

## Features

### Classroom (/classroom)

The main student experience. A full-page Tldraw v5 infinite canvas occupies the center of the screen, with a 420px chat sidebar on the right. Students can draw anything on the canvas -- equations, diagrams, shapes, text, annotations -- and either type in the chat or speak via microphone. The AI responds in three ways simultaneously: a chat message appears in the sidebar, text shapes are written directly onto the canvas at the student's current viewport position, and the response is spoken through browser TTS with animated word-by-word captions displayed at the bottom of the canvas.

The canvas parser runs before every AI request, analyzing the full shape tree and producing a structured description that includes shape counts, text content, geometric details, arrow connections, line characteristics, and a high-level diagram type classification (algebraic equation, coordinate plane, flowchart, geometric figure, and so on).

### Teacher Dashboard (/dashboard)

An RBAC-protected panel with three sections. The concept mastery panel shows a bar chart of concepts versus struggle frequency. The live interventions feed displays struggling students in real-time, powered by Supabase Realtime subscriptions. The cognitive replays panel lists all saved sessions with student name, concept, and timestamp, each with a play button that opens the full rrweb player. Access is restricted to users with the teacher role, with a localStorage fallback if the database is unreachable.

### Aha! Replays (/replay/[id])

Every classroom session is recorded by rrweb, capturing all canvas interactions, text input, and UI state changes. When a session ends, the events are compressed and saved to Supabase session_replays along with the canvas snapshot. If the database connection fails, the replay is downloaded as a local JSON file. The replay player reconstructs the full canvas session with playback controls, and teachers can leave evaluation notes that are saved alongside the replay data.

### Adaptive Skill Tree

The database includes a self-referencing skills table with 30 seeded skills across 7 root subjects (Arithmetic, Algebra, Geometry, Trigonometry, Calculus, Statistics, and Computer Science Basics). Each skill has a difficulty rating, icon, description, and optional parent relationship. A separate skill_prerequisites table defines learning dependencies as a directed acyclic graph. Per-user progress is tracked in user_skills with mastery level (0.00 to 1.00), attempt counts, and recency data. The recommendation algorithm scores each unlocked skill based on current mastery, days since last practice, and the number of skills it would unlock, returning the highest-priority next step.

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Groq API key. Get one free at console.groq.com.
- A Supabase project for authentication and persistence (free tier at supabase.com).

### Setup

```bash
git clone https://github.com/shashank-tomar0/ai-tutor.git
cd ai-tutor
npm install
```

Create `.env.local` in the project root:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Open your Supabase dashboard, go to the SQL Editor, and run the entire contents of `supabase_schema.sql`. This creates all six tables and seeds the skill tree.

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Testing the Full Flow

1. Open the landing page and click "START A SESSION" or navigate directly to /classroom.
2. Sign in with Google OAuth through Supabase Auth.
3. Choose "Student" on the role selection screen.
4. Draw something on the canvas -- an equation, a shape, or a diagram.
5. Type a question in the chat sidebar or click START and speak.
6. The AI responds in chat, writes on the canvas, and speaks with captions.
7. End the session to save the replay.
8. Sign in again as a teacher and navigate to /dashboard to see interventions and replays.

---

## Project Structure

```
src/
  app/
    page.tsx                  Landing page
    layout.tsx                Root layout with fonts
    globals.css               Tailwind and global styles
    classroom/page.tsx        Canvas, chat, voice, and captions
    dashboard/page.tsx        Teacher analytics panel
    login/page.tsx            Supabase Auth UI
    login/role-select/page.tsx  Student or Teacher role picker
    replay/page.tsx           Local JSON file upload viewer
    replay/[id]/page.tsx      Cloud replay player with teacher feedback form
    api/
      chat/route.ts           Text and canvas context to Groq
      chat-audio/route.ts     Voice transcription and canvas to Groq
      tts/route.ts            TTS endpoint (delegates to browser speech)
      skills/route.ts         Skill tree with user progress
      skills/recommendations/route.ts  Next skill recommendation engine
      skills/update/route.ts  Mastery progress update
      dashboard/              Analytics endpoints
  components/
    ChatSidebar.tsx           Message history, input, session controls, voice selector
    CaptionsBar.tsx           Animated speech captions with word-by-word reveal
  utils/
    supabase.ts               Supabase client initialization
    skill-engine.ts           Recommendation algorithm and mastery helpers
    canvas-parser.ts          Deep canvas shape analysis engine
```

---

## How It Works

The core interaction pipeline works as follows:

1. The student draws on the canvas and either types a message in the chat sidebar or speaks into the microphone.
2. If speaking, a voice activity detector using the Web Audio API AnalyserNode monitors audio levels. When speech is detected above a threshold, a MediaRecorder captures audio until 1.5 seconds of silence elapses, then sends the recording to Groq Whisper for transcription.
3. Before the AI request is made, the Canvas Parser serializes every shape on the canvas. Text shapes are extracted for content. Geometric shapes are identified by type and position. Arrows are traced from their start to end points. Lines are classified as straight, curved, horizontal, vertical, or wavy. Higher-level structures such as math equations, coordinate planes, tables, and flowcharts are detected heuristically.
4. The student's message and the structured canvas description are sent to Groq Llama-3.3-70b, which has been prompted to act as a supportive tutor across all subjects. It returns a JSON object with three fields: is_struggling (boolean), concept (the identified topic), and response_text (the explanation or guiding question).
5. The response appears in three places simultaneously: as a new AI message in the chat sidebar, as text shapes written onto the canvas at the current viewport position, and as spoken audio through browser SpeechSynthesis with an animated caption overlay.
6. If the student was identified as struggling, an intervention record is inserted into Supabase, which triggers a Realtime push to the teacher dashboard.

---

## Tech Stack

| Technology | Role |
|-----------|------|
| Next.js 16 | Full-stack framework with App Router and API routes |
| React 19 | UI component library |
| Tailwind CSS | Utility-first styling |
| Tldraw v5 | Infinite whiteboard canvas with rich shape API |
| Groq Llama-3.3-70b | Socratic reasoning engine (800+ tokens per second) |
| Groq Whisper | Speech-to-text transcription |
| Web Speech API | Free browser-based text-to-speech |
| Supabase | Authentication, PostgreSQL, and Realtime subscriptions |
| rrweb | DOM session recording and playback |
| Recharts | Dashboard concept mastery charts |
| Framer Motion | Animation library |
| Canvas Parser | Custom shape, geometry, and diagram detection engine |

---

## Roadmap

### Shipped

- Socratic engine with full canvas context awareness
- Tldraw v5 infinite canvas with drawing tools
- Voice activity detection and Groq Whisper transcription
- Browser SpeechSynthesis text-to-speech
- Chat sidebar with message history and typing indicator
- Animated captions bar synced with TTS
- AI writes explanations onto the canvas as text shapes
- Teacher dashboard with heatmap, live interventions, and replay library
- rrweb session recording and playback with teacher feedback
- Supabase authentication with Google OAuth and RBAC
- Adaptive skill tree with 30 seeded skills and prerequisite chains
- Per-user mastery tracking with recommendation algorithm
- Canvas parser for shape, geometry, equation, and diagram detection
- Excalidraw architecture diagram
- Comprehensive product requirements document

### Tier 1 (Next)

- Connect real database queries to dashboard analytics endpoints
- Student progress dashboard with daily streaks, mastery timeline charts, and achievement badges
- Session summary modal showing mastery delta, concept coverage, and struggle counts
- Multi-subject skill trees for physics, chemistry, biology, and programming
- Proper user identity in intervention logging

### Tier 2 (Growth)

- Multiplayer classrooms using Tldraw collaborative sync with live teacher spectating
- Dark mode with system preference detection and manual toggle
- Parent portal with weekly progress digest emails
- Curriculum alignment with Common Core, CBSE, and GCSE standards

### Tier 3 (Scale)

- LMS integrations with Google Classroom, Canvas, and Schoology via LTI 1.3
- Offline-first progressive web app with IndexedDB sync queue
- Mobile native applications for iOS and Android
- Fine-tuned Socratic model for reduced API costs
- Enterprise admin dashboard with multi-school analytics and SSO

### God-Level Upgrades

1. Multimodal canvas vision. Send canvas PNG snapshots alongside shape JSON to Gemini 2.0 Flash Vision for understanding of handwritten math and hand-drawn diagrams that pure vector analysis cannot capture.

2. Low-latency voice pipeline. Replace the current request-response voice cycle with a streaming WebSocket pipeline using Cartesia or Deepgram for sub-600-millisecond voice-to-voice interaction.

3. Interactive AI canvas generator. Extend the AI response format to emit canvas drawing commands such as draw_grid, plot_line, highlight_error, and draw_triangle, enabling the AI to illustrate concepts directly on the canvas.

4. Audio-synchronized replays. Record WebRTC audio streams alongside rrweb DOM events so that teachers can hear a student's voice and hesitation synchronized with the exact moment they drew or typed something on the canvas.

5. Multiplayer Socratic classroom. Implement Tldraw collaborative sync via Yjs and WebSockets, allowing a teacher to spectate up to 30 student canvases simultaneously and push problems to all students at once.

6. Gamified 3D knowledge graph. Replace the tree list with an interactive Three.js or React Flow constellation where skill nodes glow red, gold, or blue based on mastery and emit particle beams along dependency paths.

---

## Contributing

Contributions are welcome. Open an issue at github.com/shashank-tomar0/ai-tutor/issues to report bugs or suggest features. The PRD in the repository root documents the full planned feature set.

```bash
npm run dev       # Start the development server on port 3000
npm run build     # Create a production build
npm run lint      # Run the linter
```

---

## License

MIT. Education should be accessible to everyone.

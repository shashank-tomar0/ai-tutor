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
  <a href="#features"><img src="https://img.shields.io/badge/Features-1a1a2e?style=for-the-badge" alt="Features"></a>
  <a href="PRD.md"><img src="https://img.shields.io/badge/Full%20PRD-1a1a2e?style=for-the-badge" alt="Full PRD"></a>
  <a href="public/newton-architecture.excalidraw"><img src="https://img.shields.io/badge/Architecture%20Diagram-1a1a2e?style=for-the-badge" alt="Architecture Diagram"></a>
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

- [Why Newton?](#why-newton)
- [The Problem We Solve](#the-problem-we-solve)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [How the Socratic Engine Works](#how-the-socratic-engine-works)
- [Tech Stack](#tech-stack)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Why Newton?

Every other open-source AI tutor is a CLI tool or a chat widget. Newton is neither. It is a complete spatial learning environment that combines an infinite digital whiteboard, real-time voice interaction, a Socratic reasoning engine, a teacher analytics dashboard, and full session replay. Students draw problems on the canvas, speak or type questions, and receive guiding responses in three forms simultaneously: a chat message, text written directly onto the canvas, and spoken audio with synchronized captions.

Newton was built because the current generation of AI tutors, including those offered by major platforms, fail to address how students actually learn. They are chat-only, so they cannot see diagrams or equations. They answer too quickly, so students copy answers instead of developing understanding. They offer no visibility to teachers, who remain blind to who is struggling and why. Newton solves all four problems in a single deployable platform.

---

## The Problem We Solve

A June 2026 Stanford randomized controlled trial across approximately 350 elementary students reached a sobering conclusion: giving students access to an AI tutor does not mean they will use it. The study found that engagement, not access, is the binding constraint. Students need a reason to return, a sense of progression, and a modality that matches how they naturally work.

Current AI tutors fail in four ways:

**They are chat-only.** Chat interfaces cannot represent spatial information. A student drawing a geometry problem or an algebraic equation has no way to show their work. The tutor cannot see the diagram, the labeled sides, or the partial attempt. This forces the student to describe in words what would be obvious in a drawing, creating friction that discourages use.

**They answer too quickly.** The standard chat paradigm optimizes for response speed. When a student asks for help, the model provides the answer. The student copies it and moves on. No learning occurs. The engagement looks good in analytics, but comprehension does not improve.

**They do not fit into how students work.** Students use paper, whiteboards, notebooks, and scratch paper. They draw, annotate, erase, and redraw. A text-only chat interface does not accommodate this workflow.

**Teachers are blind.** Even when students do use AI tutors, teachers have no visibility into the process. They do not know who struggled, with which concept, or what the tutor said. They cannot identify which students had a breakthrough and which ones copied the answer.

Newton addresses all four problems with a single architecture centered on the spatial canvas.

---

## Architecture

<p align="center">
  <img src="newton-architecture.svg" alt="Newton System Architecture" width="100%" />
</p>

Newton runs entirely within a single Next.js 16 codebase deployable to Vercel in one click. The system is organized into four layers.

### Client Layer (Browser)

The frontend runs Next.js 16 with React 19 and Tailwind CSS. The primary interface is the classroom page, which presents a 2-column layout with a Tldraw v5 infinite whiteboard on the left and a 420px chat sidebar on the right.

The Tldraw canvas supports the full drawing toolset including text, geometric shapes, freehand drawing, arrows, sticky notes, and laser pointers. All shapes are serialized to JSON and sent with every AI request. A custom Canvas Parser engine analyzes the shape tree before the request reaches the LLM, producing a structured description that includes shape counts, extracted text content, geometric type and dimensions, arrow start and end points, line classification (straight, curved, horizontal, vertical, wavy), and higher-level diagram type detection (algebraic equation, coordinate plane, table, flowchart, geometric figure).

The chat sidebar provides message history with user messages right-aligned on black and AI messages left-aligned with a brain icon and the Newton label. A typing indicator animates during AI processing. Voice controls allow toggling between browser SpeechSynthesis and mute. A session start and end button controls the voice activity detection pipeline.

The CaptionsBar component overlays the bottom of the canvas area and displays AI speech as animated word-by-word captions synchronized with TTS audio. Words appear progressively at 50 to 80 millisecond intervals, with a blinking cursor during active typing and a 2-second fade delay after speech completes.

### API Layer (Next.js Route Handlers)

All server-side logic is implemented as Next.js App Router route handlers within the same project. The main endpoints are:

- POST /api/chat-audio. Accepts multipart form data containing either an audio blob or a text string, the current canvas shapes serialized as JSON, and optional skill context. If an audio blob is present, it is transcribed by Groq Whisper. The combined transcript and canvas analysis are sent to the Socratic engine and the response is returned as JSON.

- POST /api/chat. Accepts a JSON body with the text transcript and canvas shapes. Used when the student types instead of speaking.

- GET /api/skills. Returns the full skill tree with user mastery progress merged, structured as a recursive hierarchy with children arrays.

- GET /api/skills/recommendations. Accepts a userId query parameter and returns a ranked list of recommended next skills based on prerequisites, current mastery, recency, and gateway value.

- POST /api/skills/update. Accepts userId, skillId, and success flag, and updates the user's mastery level using a compounding formula based on attempt count and success rate.

### LLM and AI Inference Layer

The core Socratic engine runs on Groq Llama-3.3-70b-versatile, chosen for its inference speed exceeding 800 tokens per second, which enables real-time conversational dialogue without perceptible latency.

The system prompt instructs the model to follow the student's lead on topic, read everything on the canvas, explain concepts clearly using analogies and worked examples, and only use Socratic questioning when the student is genuinely stuck. The model responds in JSON format with three fields: is_struggling (boolean), concept (the identified topic), and response_text (the explanation or guiding question).

Groq Whisper handles speech-to-text using the whisper-large-v3 model. Audio is captured through the browser MediaRecorder API, triggered by a voice activity detector that monitors audio levels through the Web Audio AnalyserNode interface.

Text-to-speech is handled by the browser native SpeechSynthesis API. This choice eliminates all infrastructure costs and latency from network requests. Voice quality depends on the operating system and browser: Windows provides Microsoft David (male) and Zira (female), macOS provides Alex, and Chrome provides Google US English. The system attempts to select a male voice by default, falling back to any English voice.

### Data Layer (Supabase)

Supabase provides three services. Authentication handles Google OAuth and email sign-in. The PostgreSQL database stores six tables: user_profiles for RBAC, session_replays for rrweb event data and canvas snapshots, interventions for the live teacher feed, skills for the self-referencing skill tree, user_skills for per-user mastery tracking, and skill_prerequisites for the learning dependency graph. Realtime subscriptions power the live teacher dashboard by pushing INSERT events from the interventions table to connected dashboard clients.

---

## Features

### Classroom

The classroom page is the primary student interface. It presents a full-screen 2-column grid with the canvas occupying the flexible center area and a 420px chat sidebar on the right.

The canvas is a Tldraw v5 infinite whiteboard with full drawing capabilities. Students can draw text, rectangles, ellipses, diamonds, triangles, arrows, lines, and freehand strokes. The canvas state persists across sessions using the Tldraw persistence key.

When a student types in the chat sidebar or speaks through the microphone, the system:

1. Serializes all shapes on the canvas into a JSON structure.
2. Runs the Canvas Parser to produce a rich textual description of the canvas contents.
3. Sends the student's message and the canvas description to the Socratic engine.
4. Receives a JSON response containing the struggle flag, concept, and response text.
5. Renders the response as a chat message in the sidebar, writes text shapes onto the canvas at the current viewport position, and speaks the response through TTS with animated captions.

The classroom also records all DOM interactions via rrweb for later playback by teachers. When a session ends, the events are compressed and saved to Supabase. If the database connection fails, the events are downloaded as a local JSON file.

### Teacher Dashboard

The dashboard is an RBAC-protected panel accessible only to users with the teacher role. It presents three panels in a grid layout.

The concept mastery panel displays a bar chart of concepts versus struggle frequency, rendered with Recharts. Data is aggregated from the interventions table.

The live interventions feed displays struggling students in real-time, showing the student name, concept, and the exact struggle text. This feed is powered by Supabase Realtime subscriptions that listen for INSERT events on the interventions table.

The cognitive replays panel lists all saved sessions with the student name, concept, and timestamp. Each entry has a play button that opens the replay player page. If no replays are available, the panel shows a fallback with a link to the manual viewer.

### Aha! Replays

The replay player reconstructs a recorded canvas session using the rrweb-player library. When a teacher opens a replay by ID, the events are fetched from Supabase and the player renders them with playback controls.

The replay page also includes a teacher feedback form. The teacher can type evaluation notes and save them to the session_replays database record. If the database is unreachable, the feedback is saved to localStorage.

### Adaptive Skill Tree

The database schema includes three tables for skill tracking. The skills table is a self-referencing tree with fields for name, subject, parent, difficulty, icon, and description. The skill_prerequisites table defines learning dependencies as a directed acyclic graph. The user_skills table tracks per-user progress with mastery level, attempt counts, and recency.

The seed data includes 30 skills across 7 root subjects: Arithmetic (6 children), Algebra (5 children), Geometry (5 children), Trigonometry (4 children), Calculus (3 children), Statistics (4 children), and Computer Science Basics (5 children). Prerequisites chain from Arithmetic through Algebra and Geometry into Trigonometry, Calculus, and Statistics.

The recommendation algorithm scores each unlocked skill based on current mastery, days since last practice, and the number of skills it unlocks. Skills that have never been practiced receive the highest priority. Skills below 30 percent mastery receive the next priority level. Skills between 30 and 60 percent mastery are prioritized third. Skills at proficient levels that have not been practiced in over 7 days receive a lower priority for review. Each skill receives a bonus for every downstream skill it would unlock.

---

## Quick Start

### Prerequisites

- Node.js 18 or later
- A Groq API key. Sign up at console.groq.com for a free account.
- A Supabase project for authentication and database. The free tier at supabase.com is sufficient.

### Installation

```bash
git clone https://github.com/shashank-tomar0/ai-tutor.git
cd ai-tutor
npm install
```

### Environment Configuration

Create a file named `.env.local` in the project root:

```env
GROQ_API_KEY=gsk_your_groq_api_key_here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Database Setup

Open your Supabase project dashboard, navigate to the SQL Editor, and run the entire contents of `supabase_schema.sql`. This creates all six database tables and inserts the seed data for the skill tree.

### Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Testing the Full Application

1. Open the landing page. The brutalist design presents the Newton manifesto, feature grid, and pricing tiers.
2. Click "START A SESSION" or navigate to /classroom. You will be redirected to the login page.
3. Sign in with Google OAuth through the Supabase Auth UI.
4. Choose "Student" on the role selection screen.
5. The classroom loads with the Tldraw canvas and chat sidebar. Draw an equation or shape on the canvas.
6. Type a question in the chat input. The AI responds in the chat, writes on the canvas, and speaks with captions.
7. Click START to enable voice mode, then speak a question. The voice is transcribed by Groq Whisper and processed through the same pipeline.
8. End the session. The replay is saved to Supabase.
9. Sign out and sign in again, choosing "Teacher" as the role.
10. Navigate to /dashboard to see the intervention feed and replay library.

---

## Project Structure

```
src/
  app/
    page.tsx                     Landing page with brutalist design
    layout.tsx                   Root layout with font loading
    globals.css                  Tailwind and global style definitions
    classroom/page.tsx           Main canvas, chat, voice, and captions interface
    dashboard/page.tsx           Teacher analytics dashboard
    login/page.tsx               Supabase Auth UI with Google OAuth
    login/role-select/page.tsx   Student or Teacher role selection
    replay/page.tsx              Local JSON file upload and playback
    replay/[id]/page.tsx         Cloud replay player with teacher feedback form
    api/
      chat/route.ts              Text and canvas context to Groq Socratic engine
      chat-audio/route.ts        Voice transcription and canvas to Groq
      tts/route.ts               TTS endpoint delegating to browser speech
      skills/route.ts            Skill tree retrieval with user progress
      skills/recommendations/route.ts  Next skill recommendation generation
      skills/update/route.ts     Mastery progress update
      dashboard/struggling/route.ts    Interventions endpoint
      dashboard/heatmap/route.ts       Concept mastery endpoint
  components/
    ChatSidebar.tsx              Message history, input, session controls, voice selector
    CaptionsBar.tsx              Animated word-by-word speech captions overlay
  utils/
    supabase.ts                  Supabase client creation
    skill-engine.ts              Recommendation algorithm and mastery calculation helpers
    canvas-parser.ts             Canvas shape analysis and diagram detection engine
```

---

## How the Socratic Engine Works

The system prompt given to Groq Llama-3.3-70b is designed to make the model follow the student's lead on topic selection. If the student asks about React, the model teaches React. If the student draws a triangle, the model teaches geometry. If the student writes an equation, the model teaches algebra. The model reads everything on the canvas, explains clearly using analogies, and resorts to Socratic questioning only when the student indicates genuine confusion.

The canvas parser runs before every request. It normalizes each shape into a standard format, extracting the type, position, dimensions, text content, and point arrays. It then bucktes shapes by type, generates type counts for a summary line, extracts all text content from text shapes and sticky notes, describes geometric shapes by type, position, and dimensions, traces arrows from their start to end points, classifies lines by their curvature and orientation, counts freehand drawing strokes, and runs a detection algorithm to identify higher-level structures such as algebraic equations, coordinate planes, tables, flowcharts, and geometric figures.

The interaction flow proceeds as follows:

1. The student types a message in the chat sidebar or speaks into the microphone. If speaking, the VAD captures audio and sends it to Groq Whisper for transcription.
2. The editor serializes all current canvas shapes to JSON.
3. The canvas parser converts the raw shape JSON into a structured textual description.
4. The transcript and canvas description are sent to the Socratic engine, which returns a JSON object with is_struggling, concept, and response_text.
5. The response is added to the chat message list, written onto the canvas as text shapes at the current viewport position, and spoken through browser TTS with animated captions.
6. If the student was identified as struggling, an intervention record is inserted into Supabase, triggering a Realtime push to the teacher dashboard.

---

## Tech Stack

| Technology | Role |
|-----------|------|
| Next.js 16 | Full-stack framework with App Router, API routes, and Vercel deployment |
| React 19 | Component-based UI library |
| Tailwind CSS | Utility-first styling framework |
| Tldraw v5 | Infinite whiteboard canvas with extensible shape API |
| Groq Llama-3.3-70b | Socratic reasoning engine with JSON schema enforcement |
| Groq Whisper | Speech-to-text transcription via whisper-large-v3 |
| Web Speech API | Browser-native text-to-speech with zero infrastructure cost |
| Supabase | Authentication, PostgreSQL database, and Realtime subscriptions |
| rrweb | DOM session recording and playback |
| Recharts | Dashboard chart rendering |
| Framer Motion | Animation library for UI transitions |
| Canvas Parser | Custom shape normalization and diagram classification engine |
| Excalidraw | System architecture diagram generation |

---

## Roadmap

### Tier 0 (Shipped)

- Socratic engine with full canvas context awareness
- Tldraw v5 infinite canvas with complete drawing toolset
- Voice activity detection using Web Audio AnalyserNode
- Groq Whisper speech-to-text transcription
- Browser SpeechSynthesis text-to-speech with male voice selection
- Chat sidebar with message history, typing indicator, and session controls
- Animated speech captions overlay with word-by-word reveal
- AI writes explanations onto the canvas as text shapes
- Teacher dashboard with concept heatmap, live intervention feed, and replay library
- rrweb session recording with Supabase storage and JSON fallback
- Supabase authentication with Google OAuth and role-based access control
- Adaptive skill tree with 30 seeded skills across 7 subjects
- Per-user mastery tracking with compounding success formula
- Prerequisite-based skill recommendation algorithm
- Canvas parser for shape, geometry, equation, and diagram detection
- Excalidraw architecture diagram with four layers and six upcoming upgrades
- Comprehensive product requirements document

### Tier 1 (Next)

- Real database integration for dashboard analytics endpoints
- Student progress dashboard with daily streak tracking, mastery timeline charts, and achievement badges
- Session summary modal showing mastery delta, concept coverage, struggle counts, and one-click replay save
- Multi-subject skill trees for physics, chemistry, biology, and programming

### Tier 2 (Growth)

- Multiplayer classrooms with Tldraw collaborative sync via Yjs and WebSockets
- Teacher can create rooms, generate join codes, spectate live student canvases, and push problems
- Dark mode with system preference detection and high-contrast accessibility
- Parent portal with weekly progress digest emails
- Curriculum alignment with Common Core, CBSE, and GCSE standards

### Tier 3 (Scale)

- LMS integrations with Google Classroom, Canvas, Schoology, and Powerschool via LTI 1.3
- Offline-first progressive web app with IndexedDB sync queue and background sync
- Mobile native applications for iOS and Android with handwriting recognition
- Fine-tuned Socratic model for reduced API costs
- Enterprise admin dashboard with multi-school analytics and SSO

### God-Level Upgrades

1. Multimodal Canvas Vision. Send canvas PNG snapshots alongside shape JSON to Gemini 2.0 Flash Vision, enabling the AI to understand handwritten math, hand-drawn diagrams, and geometric angles that pure vector analysis cannot interpret.

2. Low-Latency Voice Pipeline. Replace the current request-response voice cycle with a streaming WebSocket pipeline using Cartesia or Deepgram, achieving sub-600-millisecond voice-to-voice interaction with interrupt handling.

3. Interactive AI Canvas Generator. Extend the AI response format to emit canvas drawing commands such as draw_grid, plot_line, highlight_error, and draw_triangle, enabling the AI to illustrate concepts directly on the canvas in real-time.

4. Audio-Synchronized Replays. Record WebRTC audio streams alongside rrweb DOM events so that teachers can hear a student's voice and hesitation synchronized frame-by-frame with their canvas interactions.

5. Multiplayer Socratic Classroom. Implement Tldraw collaborative sync via Yjs and WebSockets, allowing a teacher to spectate up to 30 student canvases simultaneously and push problems to all students at once.

6. Gamified 3D Knowledge Graph. Replace the tree list with an interactive Three.js or React Flow constellation where skill nodes glow in mastery colors and emit particle beams along dependency paths.

---

## Contributing

Contributions are welcome. Open an issue at github.com/shashank-tomar0/ai-tutor/issues to report bugs or suggest features. The PRD in the repository root documents the full planned feature set. The development commands are standard Next.js:

```bash
npm run dev       # Development server on port 3000
npm run build     # Production build with type checking
npm run lint      # ESLint code quality check
```

---

## License

MIT. Education should be accessible to everyone.

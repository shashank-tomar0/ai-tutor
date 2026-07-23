
<p align="center">
  <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop" alt="Newton Banner" width="100%" />
</p>

<h1 align="center">🧠 Project Newton — The Cognitive AI Tutor</h1>

<p align="center">
  <strong>The world's first open-source Socratic AI co-pilot with real-time voice + spatial canvas intelligence</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Groq_Llama_3.3_70B-f97316?style=flat-square" alt="Groq Llama 3.3 70B" />
  <img src="https://img.shields.io/badge/Tldraw_5-000000?style=flat-square&logo=tldraw" alt="Tldraw" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/rrweb-FF6B6B?style=flat-square" alt="rrweb Session Replay" />
  <img src="https://img.shields.io/badge/Three.js-000000?style=flat-square&logo=threedotjs" alt="Three.js" />
</p>

---

## 📋 Table of Contents

- [Why Newton?](#-why-newton)
- [The Problem We Solve](#-the-problem-we-solve)
- [Architecture](#-architecture)
- [Features Deep Dive](#-features-deep-dive)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Tech Stack & Why](#-tech-stack--why)
- [Socratic Engine — How It Works](#-socratic-engine--how-it-works)
- [Market Landscape & Positioning](#-market-landscape--positioning)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Why Newton?

> **"It does not give answers. It guides students to the 'Aha!' moment."**

Newton is a **venture-grade, dual-core AI tutoring platform** that merges **real-time auditory reasoning** with **spatial awareness of a digital whiteboard**. Built for students who need more than a chatbot — they need a thinking partner that sees what they draw, hears what they say, and asks the right Socratic question to unlock understanding.

Unlike every other open-source AI tutor, Newton isn't a CLI tool or a chat widget. It's a **full spatial learning environment**:

- 🎙️ **Voice-first** — Browser-native speech recognition & synthesis (100% free, zero latency)
- ✍️ **Infinite Canvas** — Draw math, diagrams, or code. The AI *sees* your shapes in real-time.
- 🧠 **Socratic by Design** — Purpose-built prompt engineering that never just hands out answers
- 📊 **Teacher Dashboard** — Live heatmaps, intervention alerts, and cognitive replay analytics
- 🔄 **Session Replay** — Every canvas interaction replayed via rrweb for breakthrough analysis

---

## 🔍 The Problem We Solve

### The AI Tutor Crisis (Stanford Study, June 2026)

A recent Stanford randomized controlled trial across ~350 elementary students found a sobering truth:

> **Giving students access to an AI tutor does not mean they will use it.**

The current generation of AI tutors fails because:
1. **They're chat-only** — No spatial/visual interaction, just text in a box
2. **They answer too quickly** — Students copy answers instead of learning
3. **They don't integrate with how students actually work** — Paper, whiteboards, diagrams
4. **Teachers are blind** — No visibility into who's struggling, with what, and why

Newton was designed from day one to solve *all four problems* — by combining voice, vision, Socratic method, and a full teacher observation layer.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │ Tldraw   │  │ Web      │  │ rrweb    │  │ Three.js  │   │
│  │ Canvas   │  │ Speech   │  │ Replay   │  │ 3D Scenes │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
│         │            │            │                          │
│  ┌──────┴────────────┴────────────┴──────────────────┐      │
│  │         Next.js 16 App Router (React 19)           │      │
│  │  /classroom  /dashboard  /replay  /login           │      │
│  └─────────────────────┬──────────────────────────────┘      │
└────────────────────────┼──────────────────────────────────────┘
                         │
┌────────────────────────┼──────────────────────────────────────┐
│           Next.js API Routes (Server)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐    │
│  │ /api/chat    │  │ /api/chat-   │  │ /api/tts          │    │
│  │ (text +      │  │ audio (voice │  │ (ElevenLabs →     │    │
│  │  canvas ctx) │  │ + VAD)      │  │  browser fallback)│    │
│  └──────┬───────┘  └──────┬───────┘  └───────────────────┘    │
│         │                 │                                    │
│  ┌──────┴─────────────────┴──────────────────────────────┐    │
│  │              Groq Llama-3.3-70b-versatile              │    │
│  │  → Socratic prompt analysis                            │    │
│  │  → Canvas shape interpretation                         │    │
│  │  → Struggle detection → Supabase intervention logging  │    │
│  └────────────────────────┬───────────────────────────────┘    │
│                           │                                    │
│  ┌────────────────────────┴───────────────────────────────┐    │
│  │              Supabase (Data Layer)                      │    │
│  │  • Auth (email + Google OAuth)                         │    │
│  │  • user_profiles (RBAC: student/teacher)                │    │
│  │  • session_replays (rrweb events + canvas snapshots)    │    │
│  │  • interventions (real-time struggle feed)              │    │
│  │  • Realtime subscriptions (live dashboard)              │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Decision | Why |
|----------|-----|
| **Browser Web Speech instead of LiveKit** | 100% free, zero latency, no infrastructure cost |
| **Groq Llama-3.3-70b** | 800+ tokens/sec inference for real-time Socratic dialogue |
| **Tldraw instead of custom canvas** | Battle-tested infinite canvas with rich shape support |
| **Next.js API Routes (no separate backend)** | Deploy entire platform to Vercel in one click |
| **Supabase Realtime** | Live teacher dashboard without WebSocket infrastructure |
| **rrweb for replays** | Full DOM recording without complex video infrastructure |
| **rrweb → fallback to local JSON** | Works even when database is unavailable |

---

## ✨ Features Deep Dive

### 1. 🎨 The Sensory Canvas (`/classroom`)

An infinite digital whiteboard where students draw, write, and explore with Newton watching.

**How it works:**
1. Student opens the classroom — Tldraw infinite canvas loads
2. rweb silently records every DOM mutation (shapes, text, drags)
3. Student speaks or types a question
4. Newton reads canvas JSON structure + voice/text input together
5. Socratic response delivered via voice (ElevenLabs or browser TTS)

**What Newton "sees" on the canvas:**
```
Input: "What's wrong with my triangle?"
Canvas state: {shapes: [{type: "draw", points: [...], ...}]}
→ Newton identifies: "I see you've drawn a triangle with angles 90°, 50°, and 50°.
  What do you know about the sum of interior angles in a triangle?"
```

**Voice Modes:**
- 🗣️ **ElevenLabs** — Premium AI voice (requires API key)
- 🔊 **Native** — Browser SpeechSynthesis (free, always works)
- 🔇 **Mute** — Text-only mode

### 2. 📊 Teacher Cognitive Dashboard (`/dashboard`)

An RBAC-protected control center for educators to monitor classroom cognitive health in real-time.

| Panel | Function |
|-------|----------|
| **Concept Mastery Heatmap** | Bar chart showing which concepts students struggle with most (powered by Recharts) |
| **Live Interventions Feed** | Real-time stream of struggling students + the Socratic prompt being used — powered by Supabase Realtime subscriptions |
| **Cognitive Replays** | Full interactive playback of student canvas sessions via rrweb with teacher feedback form |

**RBAC Flow:**
```
Login → Supabase Auth → user_profiles.role check
  → "student" → /classroom
  → "teacher" → /dashboard (with localStorage fallback)
```

### 3. 🔄 Aha! Replays (`/replay/[id]`)

Every time Newton detects a cognitive breakthrough, the entire session (voice + DOM mutations) is serialized and stored.

**Teacher Workflow:**
1. Student completes a session
2. rrweb events compressed and saved to Supabase (or local JSON fallback)
3. Teacher opens replay from dashboard
4. Full canvas reconstruction with playback controls
5. Teacher adds evaluation notes → saved to Supabase (or localStorage fallback)

### 4. 🧠 The Socratic Engine

Newton's core AI loop is **purpose-engineered** to strictly avoid direct answers:

```
Student Input → Canvas JSON Context → Groq Llama 3.3 70B
  → Struggle Detection (is_struggling, concept)
  → Socratic Question Generation → TTS Output
  → Log intervention to Supabase if struggling
```

The system prompt:
> *"Analyze the student's message and determine if they are struggling. If they are, provide a Socratic response_text. If they are doing fine, provide a normal encouraging response_text."*

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- A Groq API key ([Get one free](https://console.groq.com/))
- (Optional) A Supabase project ([supabase.com](https://supabase.com))
- (Optional) An ElevenLabs API key for premium TTS

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/project-newton.git
cd project-newton
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
GROQ_API_KEY=gsk_your_groq_api_key_here

# Required for auth + persistence
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional — premium TTS
ELEVENLABS_API_KEY=your_elevenlabs_key_here
```

### 3. Database Setup

Run `supabase_schema.sql` in your Supabase SQL Editor to create:
- `user_profiles` — RBAC (student/teacher)
- `session_replays` — rrweb event storage

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🚀

### 5. Try the Full Flow

1. **Landing page** → Click "START A SESSION" or navigate to `/classroom`
2. **Login** → Supabase Auth (email or Google)
3. **Role Select** → Pick "Student" or "Teacher"
4. **Classroom** → Draw something, click "START SESSION", speak or type
5. **Dashboard** → Teacher login at `/dashboard` to see interventions + replays

---

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page (brutalist 3D design)
│   ├── layout.tsx            # Root layout (Inter, DM Serif, Caveat fonts)
│   ├── globals.css           # Tailwind + global styles
│   │
│   ├── classroom/
│   │   └── page.tsx          # Main canvas + voice + AI chat interface
│   │
│   ├── dashboard/
│   │   └── page.tsx          # Teacher analytics (heatmap, interventions, replays)
│   │
│   ├── login/
│   │   ├── page.tsx          # Supabase Auth (email + Google OAuth)
│   │   └── role-select/
│   │       └── page.tsx      # Student vs Teacher role picker
│   │
│   ├── replay/
│   │   ├── page.tsx          # Local JSON file upload viewer
│   │   └── [id]/
│   │       └── page.tsx      # Cloud replay + teacher feedback form
│   │
│   └── api/
│       ├── chat/route.ts     # Text + canvas context → Groq Socratic engine
│       ├── chat-audio/route.ts # Voice (Whisper) + canvas → Groq
│       ├── tts/route.ts      # ElevenLabs TTS with browser fallback
│       └── dashboard/
│           ├── struggling/route.ts  # Mock interventions endpoint
│           └── heatmap/route.ts     # Mock concept mastery endpoint
│
└── utils/
    └── supabase.ts           # Supabase client initialization

# Key config files
├── supabase_schema.sql       # Database schema (run in Supabase SQL Editor)
├── .env.local                # Environment variables
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind configuration
└── package.json              # Dependencies
```

---

## 🛠️ Tech Stack & Why

| Technology | Purpose | Why This One |
|-----------|---------|-------------|
| **Next.js 16** | Full-stack framework | App Router, API routes, React 19, Vercel deploy |
| **React 19** | UI library | Concurrency, server components, latest ecosystem |
| **Tailwind CSS** | Styling | Utility-first, fast iteration, consistent design |
| **Tldraw 5** | Infinite canvas | Battle-tested, rich shape API, extensible |
| **Groq SDK** | LLM inference | 800+ tok/s on Llama-3.3-70b for real-time Socratic dialogue |
| **Supabase** | Auth + DB + Realtime | PostgreSQL, instant APIs, realtime subscriptions |
| **rrweb** | Session replay | Full DOM recording without video infrastructure |
| **Web Speech API** | STT + TTS | 100% free, browser-native, zero infra cost |
| **ElevenLabs** | Premium TTS | Best-in-class AI voice when API key is configured |
| **Three.js / R3F** | 3D scenes | Premium landing page experience |
| **Framer Motion** | Animations | Production-ready React animation library |
| **Recharts** | Charts | Dashboard concept mastery heatmaps |

---

## 🧪 Socratic Engine — How It Works

Newton is **not** a generic chatbot with an education prompt. It's a **purpose-built Socratic engine** that:

### Struggle Detection Pipeline

```
1. Student speaks/types → Whisper transcription (or direct text)
2. Canvas shapes serialized → JSON structure of all shapes + text
3. Both sent to Groq Llama-3.3-70b with strict JSON output
4. Engine returns: { is_struggling, concept, response_text }
5. If struggling → Logged to Supabase interventions table
6. Response played via TTS → Student hears leading question, not answer
```

### Prompt Design Principles

| Principle | Implementation |
|-----------|---------------|
| **No direct answers** | System prompt explicitly forbids giving solutions |
| **Spatial awareness** | Canvas JSON is injected as context before every query |
| **Leading questions** | Response always ends with a question the student must answer |
| **Struggle detection** | Separate tracking for teacher visibility |
| **Encouragement** | Non-struggling responses are positive and reinforcing |

### Example Interaction

```
Student draws: Right triangle with sides labeled "3", "4", "?"
Student says: "I can't find the hypotenuse"

Newton sees: Canvas has triangle + 3 text labels
Newton thinks: Student is struggling with Pythagorean Theorem
Newton responds: "I see you've labeled two sides of your right triangle.
  You know the legs are 3 and 4. What relationship connects the three sides
  of a right triangle?"
```

---

## 📊 Market Landscape & Positioning

### Current Open-Source AI Tutor Landscape

| Project | Stars | Approach | Gap |
|---------|-------|----------|-----|
| **DeepTutor** ⭐29.3k | Multi-agent RAG CLI tutor | CLI-only, no visual/spatial interaction |
| **human-skill-tree** ⭐590 | Skill tree based learning | No real-time tutoring, no voice |
| **Bloom** ⭐207 | Claude Code skill, Bloom's 2-Sigma | Agent skill, not a full app |
| **studyield** ⭐64 | Exam cloning, knowledge graphs | No real-time canvas interaction |
| **OpenTutor** ⭐50 | Block-based adaptive learning | No voice, no session replay |
| **Newton** *(you are here)* | **Voice + Canvas + Socratic + Dashboard** | **Only project combining ALL features** |

### Key Market Gaps Newton Fills

| Gap | Current State | Newton Solution |
|-----|---------------|-----------------|
| **Voice + Visual** | Most tutors are text-only | Real-time voice + spatial canvas |
| **Teacher Visibility** | No teacher tools | Live dashboard + replays + interventions |
| **Socratic Method** | Few implement true Socratic | Purpose-built prompt engine |
| **Session Replay** | None offer rrweb recording | Full DOM replay + teacher feedback |
| **Engagement** | Stanford study shows low usage | Multi-modal interaction keeps students engaged |
| **Cost** | LiveKit/Vonage cost money | 100% free browser-native Web Speech |

### Competitive Edge

> **Newton is the only open-source AI tutor that combines an infinite whiteboard, real-time voice interaction, Socratic methodology, teacher analytics dashboard, and full session replay — all deployable to Vercel in one click.**

---

## 🗺️ Roadmap

### Now — Core Foundation ✅
- [x] Infinite Tldraw canvas with voice/text interaction
- [x] Groq-powered Socratic engine with struggle detection
- [x] Teacher dashboard with heatmaps + live interventions
- [x] rrweb session replay with teacher feedback
- [x] Supabase auth + RBAC (student/teacher)
- [x] ElevenLabs TTS with browser fallback

### Next — Intelligence Layer 🔄
- [ ] **Personalized Learning Paths** — Adaptive skill tree based on student performance
- [ ] **Multi-Agent Architecture** — Separate agents for math, code, writing, science tutoring
- [ ] **Spaced Repetition Integration** — Anki/MemoAI sync for long-term retention
- [ ] **Code Execution Sandbox** — Run student code in-browser with visual feedback

### Future — Platform Scale 🚀
- [ ] **Collaborative Classroom** — Multi-student canvas with teacher moderation
- [ ] **Offline Mode** — Local LLM support (Ollama/LM Studio) for zero-cost operation
- [ ] **Rich Content Management** — Curriculum mapping + lesson plan import
- [ ] **Student Progress Analytics** — Personal growth dashboard for learners
- [ ] **Mobile Support** — Responsive canvas for tablets
- [ ] **LTI Integration** — Connect with Canvas, Moodle, Google Classroom
- [ ] **Marketplace** — Community-shared lesson plans, prompts, and assessment templates

---

## 🤝 Contributing

We believe the future of education is open source. Contributions of all kinds are welcome:

- **🐛 Found a bug?** [Open an issue](https://github.com/yourusername/project-newton/issues)
- **💡 Have an idea?** Start a discussion
- **🔧 Want to code?** Check the roadmap above — anything marked 🔄 or 🚀 is fair game
- **📚 Documentation?** Better docs, tutorials, and examples are always appreciated

### Development Setup

```bash
npm run dev     # Start dev server
npm run build   # Production build
npm run lint    # Code quality
```

---

## 📄 License

MIT — Because education should be accessible to everyone.

---

<p align="center">
  <strong>Built with ❤️ for the future of learning.</strong><br>
  <em>Newton doesn't give answers. It creates thinkers.</em>
</p>

<p align="center">
  <a href="#-why-newton">↑ Back to top</a>
</p>

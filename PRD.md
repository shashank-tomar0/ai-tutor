# 📄 Project Newton — Product Requirements Document (PRD)

> **Status:** v1.0 Draft
> **Last Updated:** 2026-07-24
> **Authors:** Shashank Tomar / Newton Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem & Opportunity](#2-problem--opportunity)
3. [Vision & Product Pillars](#3-vision--product-pillars)
4. [Target Users & Personas](#4-target-users--personas)
5. [Feature Roadmap (4 Tiers)](#5-feature-roadmap-4-tiers)
6. [Current Feature Specifications (v1.0)](#6-current-feature-specifications-v10)
7. [Tier 1 — Next Features (Detailed Specs)](#7-tier-1--next-features-detailed-specs)
8. [Tier 2 — Growth Features (Detailed Specs)](#8-tier-2--growth-features-detailed-specs)
9. [Tier 3 — Scale Features (Detailed Specs)](#9-tier-3--scale-features-detailed-specs)
10. [Platform & Architecture](#10-platform--architecture)
11. [Data Model Reference](#11-data-model-reference)
12. [Success Metrics & KPIs](#12-success-metrics--kpis)
13. [Competitive Landscape](#13-competitive-landscape)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Open Questions](#15-open-questions)

---

## 1. Executive Summary

**Project Newton** is a cognitive AI tutoring platform that uses a **Socratic reasoning engine**, **real-time spatial canvas**, and **voice-first interaction** to help students learn by thinking — not by receiving answers. It is built for the gap identified by the Stanford June 2026 study: *access to AI tutors does not guarantee usage*. Newton solves this through adaptive skill trees, habit-forming progression loops, and teacher-visible breakthrough replays.

| Dimension | Target |
|-----------|--------|
| **Platform** | Web (Next.js 16) — PWA, mobile-responsive |
| **Primary Users** | K-12 and college students (self-learn), teachers (classroom adoption) |
| **Revenue Model** | Freemium (free canvas + 5 sessions/month) → Pro ($20/mo unlimited) |
| **Launch Target** | Q3 2026 (MVP v1.0) |

---

## 2. Problem & Opportunity

### 2.1 The Problem

| Problem | Evidence |
|---------|----------|
| AI tutors give answers, not understanding | Existing chatbots answer directly → students don't learn |
| No spatial reasoning | Chat-only tutors can't see drawn diagrams, equations, or wireframes |
| Access ≠ usage | Stanford 2026 RCT: 350 students, most didn't use available AI tutors |
| No progression system | Generic chat → no "what's next," no mastery tracking |
| Teachers are blind | No visibility into how a student arrived at an answer |

### 2.2 The Opportunity

| Market Signal | Detail |
|---------------|--------|
| EdTech market projected | $740B by 2030, AI tutoring fastest-growing segment |
| Khan Academy's Khanmigo | Proves demand — but closed-source, $44/mo, no canvas |
| Groq inference speed | <500ms latency makes real-time Socratic feasible |
| Browser-native Web Speech | Zero-cost STT/TTS — no LiveKit, no GPU, no infra |
| Post-COVID learning loss | 2+ years behind in math globally — desperate need for tools |

---

## 3. Vision & Product Pillars

### Vision Statement

> **Newton is the world's first Socratic AI co-pilot that watches you think — an infinite whiteboard + voice tutor that guides you to the "Aha!" moment instead of giving you the answer.**

### Four Pillars

| Pillar | Principle | What It Means |
|--------|-----------|---------------|
| **🧠 Think, Don't Answer** | Socratic-by-design | AI output is enforced as questions only via prompt architecture |
| **✏️ See, Don't Guess** | Spatial awareness | AI reads canvas JSON — shapes, text, diagrams — not just chat |
| **🎯 Progress, Don't Wander** | Adaptive path | Prerequisite-based skill tree → mastery tracking → "Recommended Next" |
| **👀 Verify, Don't Trust** | Teacher visibility | Full session replay (rrweb + voice), intervention feed, feedback loop |

---

## 4. Target Users & Personas

### Persona 1: Maya — The Struggling Student

| Attribute | Detail |
|-----------|--------|
| **Age** | 15, high school sophomore |
| **Pain** | Falling behind in Algebra II. Embarrassed to ask questions in class. |
| **Behavior** | Draws problems by hand on paper; needs to see + talk to understand |
| **Newton Fit** | Draws equations on canvas, speaks "I don't get factoring," Newton guides with questions |

### Persona 2: Mr. Harrison — The Tech-Forward Teacher

| Attribute | Detail |
|-----------|--------|
| **Age** | 38, high school math teacher, 35 students |
| **Pain** | Can't tell which students actually understand vs. copied the answer |
| **Behavior** | Reviews homework, but has zero visibility into *process* |
| **Newton Fit** | Assigns Newton sessions. Watches replays. Sees intervention feed in real-time. Leaves feedback. |

### Persona 3: Priya — The Self-Learner

| Attribute | Detail |
|-----------|--------|
| **Age** | 22, CS student, self-teaching calculus |
| **Pain** | YouTube videos are passive. Needs active problem-solving with feedback. |
| **Behavior** | Wants to track progress, build streaks, feel accomplishment |
| **Newton Fit** | Skill tree → daily practice → streak tracking → mastery badges → advanced topics |

---

## 5. Feature Roadmap (4 Tiers)

```
Tier 0 (v1.0 — ✅ SHIPPED)
├── Socratic Engine (Groq Llama-3.3-70b)
├── Live Canvas (Tldraw)
├── Voice Pipeline (WebRTC VAD → Groq Whisper → OpenRouter TTS / SpeechSynthesis)
├── Teacher Dashboard (heatmap, intervention feed, replay library)
├── Aha! Replays (rrweb recording + playback)
├── Authentication (Google OAuth + Supabase Auth)
├── RBAC (Student / Teacher role selection)
├── Landing Page (brutalist design, pricing, philosophy)
├── Adaptive Skill Tree (30+ skills, prerequisites, mastery tracking)
├── Skill Recommendations API
├── Session persistence (local canvas + cloud replays)
└── Architecture Diagram (Excalidraw)

Tier 1 (Q3 2026 — NEXT)
├── Student Progress Dashboard
│   ├── Streak tracking (daily practice → consecutive day counter)
│   ├── Weekly goal setting (pick 3 skills / week)
│   ├── Mastery timeline chart (progress over time per subject)
│   ├── Badge system (First Aha!, 7-Day Streak, Subject Master, etc.)
│   └── "Last session" summary card
├── Multi-Subject Skill Trees
│   ├── Physics (Mechanics, Thermodynamics, Optics, Electromagnetism)
│   ├── Chemistry (Atomic Structure, Bonding, Reactions, Stoichiometry)
│   ├── Biology (Cell Biology, Genetics, Evolution, Ecology)
│   └── Programming (Python, JavaScript, Data Structures)
├── Session Summary Modal
│   ├── Skill mastery delta (before → after)
│   ├── Concepts covered
│   ├── Struggle count vs. breakthroughs
│   └── One-click "save replay + update skill" on session end
├── Enhanced Socratic Prompting
│   ├── Skill-context aware system prompt injection
│   ├── Canvas shape analysis (geometric reasoning for geometry skills)
│   └── Difficulty-adaptive questioning (easy/hard based on mastery)

Tier 2 (Q4 2026 — GROWTH)
├── Multiplayer Classrooms
│   ├── Teacher creates room → generates 6-digit join code
│   ├── Students join → teacher sees live session roster
│   ├── Teacher can push a problem to all canvases simultaneously
│   ├── "Raise hand" → teacher gets notified
│   └── End class → bulk replay save
├── Parent Portal
│   ├── Weekly progress digest email
│   ├── Time spent per subject
│   ├── Skills mastered vs. struggling
│   └── Compare vs. class average (anonymous)
├── Curriculum Alignment
│   ├── Common Core (US) / CBSE (India) / GCSE (UK) standards
│   ├── Skill → standard mapping
│   ├── Teacher can assign "standard X" as session focus
│   └── Progress reports per standard
├── Dark Mode + Accessibility
│   ├── Full dark mode theme for classroom and dashboard
│   ├── High-contrast mode
│   ├── Screen reader support for canvas elements
│   └── Font size controls (dyslexia-friendly option)

Tier 3 (Q1 2027 — SCALE)
├── LMS Integrations
│   ├── Google Classroom (roster sync, grade sync)
│   ├── Canvas LMS (LTI 1.3 standard)
│   ├── Schoology / Powerschool
│   └── Auto-create student accounts from LMS roster
├── Offline-First PWA
│   ├── Service worker → canvas works without internet
│   ├── Queue voice/text queries → sync when online
│   ├── Local IndexedDB for skill progress
│   └── Background sync for replays
├── Mobile Native (React Native / Expo)
│   ├── iOS + Android apps
│   ├── Handwriting recognition (canvas with finger/stylus)
│   ├── Push notifications (streak reminders, teacher feedback)
│   └── Share replays as video export
├── Fine-Tuned Socratic Model
│   ├── Dataset: 10K curated Socratic dialogues
│   ├── Fine-tune Llama-3.3 on response-format-only (no answers)
│   ├── Self-host with vLLM / Ollama
│   └── Reduces API costs to near-zero
├── Enterprise Admin Dashboard
│   ├── School/district-level analytics
│   ├── Usage reports (active students, sessions, mastered skills)
│   ├── Teacher effectiveness score (based on student progress)
│   ├── API key management for LMS sync
│   └── SSO (SAML / OIDC — Google Workspace, Microsoft 365)
```

---

## 6. Current Feature Specifications (v1.0 ✅)

### 6.1 Socratic Engine

**File:** `src/app/api/chat-audio/route.ts`, `src/app/api/chat/route.ts`

**Model:** Groq Llama-3.3-70b-versatile (JSON response format enforced)

**System Prompt Architecture:**
```
You are Newton, an expert Socratic tutor.
Canvas state: {shapes summary}
Skill focus: {selected skill}
→ Analyze struggle → return JSON: {is_struggling, concept, response_text}
→ Response must be a question, never an answer
→ If struggling → log intervention to Supabase Realtime
```

**Canvas Injection:**
- Shapes serialized → text shapes concatenated → "The user has written: {text}"
- Non-text shapes counted → "The user has drawn {N} shapes"
- Selected skill name + description injected for scoped tutoring

**Intervention Flow:**
```
Student struggles → LLM returns is_struggling: true
→ INSERT into interventions table → Supabase Realtime pushes to teacher dashboard
→ Teacher sees: student name, concept, struggle text, timestamp
```

### 6.2 Live Canvas (Tldraw)

**File:** `src/app/classroom/page.tsx`

**Features:**
- Infinite whiteboard via Tldraw v5
- Persistence keyed to browser (`persistenceKey="newton-canvas-v2"`)
- Shapes serialized as JSON → sent with every chat/audio request
- Canvas snapshot saved to Supabase on session end

**States:**
| State | UI |
|-------|----|
| Loading | Tldraw internal loading |
| Empty | "Type your mathematical logic here..." placeholder |
| Active | Full drawing tools visible |
| Session running | Mic recording indicator + brain pulse animation |
| Error | Fallback to text-only input |

### 6.3 Voice Pipeline

**STT (Speech-to-Text):**
```
Browser mic → MediaRecorder (webm) → Groq Whisper API (whisper-large-v3)
→ transcript returned → fed to Socratic engine
```

**VAD (Voice Activity Detection):**
```
AnalyserNode (fftSize=512) → getByteFrequencyData → average amplitude
→ threshold > 15 → start recording
→ silence > 1500ms → stop recording → send for transcription
→ isProcessingRef prevents overlapping requests
```

**TTS (Text-to-Speech):**
```
Primary: OpenRouter (OpenAI TTS) → tts-1 model → MP3 stream
  Voices: alloy (default), nova, shimmer, echo, fable, onyx
  Models: tts-1 (fast), tts-1-hd (high quality)
Fallback: Browser window.speechSynthesis (free, no API key needed)
Mute: Sets voiceType='mute' → no audio output
```

**Voice Selector UI:**
| Option | Backend | Cost |
|--------|---------|------|
| OpenRouter | OpenRouter API → OpenAI TTS | ~$0.015/1K chars |
| Native | Browser SpeechSynthesis | $0 |
| Mute | No output | $0 |

### 6.4 Adaptive Skill Tree

**Database:**
- `skills` — self-referencing tree (parent_id), 30 skills seeded across 7 root subjects
- `skill_prerequisites` — DAG for learning dependencies (algebra requires arithmetic)
- `user_skills` — per-user mastery (level 0-1, attempts, successful_attempts, last_practiced)

**Recommendation Algorithm:**
```
score = 0
if never practiced → score = 100 (highest priority)
if struggling (mastery < 0.3) → score = 90 - (mastery * 100)
if developing (mastery 0.3-0.6) → score = 70 - (mastery * 100)
if proficient + due for review (7+ days) → score = 50 + days_since
if mastered or recent → skip
bonus: +5 per skill this unlocks (gateway boost)
```

**UI:**
- Collapsible sidebar (toggle via SKILLS button in top bar)
- Recursive tree renderer with indent per depth level
- Color coding: none/gray → red <30% → amber <60% → blue <85% → green ≥85%
- "Recommended Next" alert card at top with reason + one-click select
- Selected skill context injected into Socratic engine

### 6.5 Teacher Dashboard

**File:** `src/app/dashboard/page.tsx`

**Panels:**
| Panel | Content | Data Source |
|-------|---------|-------------|
| **01 Mastery** | Bar chart (Recharts) — concept vs. score | Supabase interventions (aggregated) |
| **02 Interventions** | Real-time feed — student name, concept, struggle | Supabase Realtime channel |
| **03 Replays** | Session list — student, concept, timestamp, play button | Supabase session_replays |

**Realtime Subscriptions:**
- `interventions` INSERT → live feed updates
- `session_replays` INSERT → replay list updates

**Role Protection:**
- Checks `user_profiles.role = 'teacher'`
- Fallback to localStorage if DB fails
- Redirects non-teachers to `/classroom`

### 6.6 Aha! Replays (rrweb)

**Recording:**
- `rrweb.record()` starts on classroom mount
- Stores events in ref (max 1500 to prevent OOM)
- On session end → POST to Supabase `session_replays`
- Falls back to JSON file download if Supabase is unreachable

**Playback:**
- `rrweb-player` renders recorded DOM events (cursor movements, canvas draws, text input)
- Playback page (`/replay/[id]`) in 2-column layout: player + metadata/feedback
- Fallback: manual file upload for locally-downloaded JSON

**Teacher Feedback:**
- Textarea in replay page → saves to `session_replays.feedback`
- Fallback to localStorage if DB fails
- Displayed alongside replay for student review

### 6.7 Authentication & RBAC

| Flow | Implementation |
|------|---------------|
| Login | Supabase Auth UI with Google OAuth provider |
| Role Select | `/login/role-select` — Card-based Student/Teacher choice |
| Profile | `user_profiles` table — id, role, name |
| Route protection | `supabase.auth.getSession()` check on classroom + dashboard |
| Fallback | localStorage role mapping if DB unavailable |

---

## 7. Tier 1 — Next Features (Detailed Specs)

### 7.1 Student Progress Dashboard

**Priority:** 🔴 HIGH
**Effort:** 2-3 days
**Dependencies:** Skill tree (done), User progress tracking (done)
**Target:** Streak retention + visible progression → habit loop

#### Spec

**Route:** `/progress` (sub-page of classroom or standalone)

**Layout:** 3-section dashboard

**Section A: Streaks & Goals**
```
┌─────────────────────────────────────┐
│  🔥 Current Streak: 12 days         │
│  Best Streak: 18 days               │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐ ┌─┐    │
│  │M│ │T│ │W│ │T│ │F│ │S│ │S│    │
│  │✅│ │✅│ │✅│ │✅│ │⬜│ │⬜│ │⬜│    │
│  └─┘ └─┘ └─┘ └─┘ └─┘ └─┘ └─┘    │
│  Weekly Goal: 3 skills → 1/3 done │
└─────────────────────────────────────┘
```

**API:** `GET /api/progress?userId=xxx`
- Returns: `{ streak, bestStreak, weeklyGoal, weeklyProgress, lastSession }`
- Calculated from `user_skills.last_practiced` timestamps

**Section B: Mastery Timeline**
```
┌─────────────────────────────────────┐
│  Mastery Over Time                  │
│  📈 [Line chart]                    │
│  X-axis: weeks  Y-axis: avg mastery │
│  Filter by subject dropdown         │
└─────────────────────────────────────┘
```

**API:** `GET /api/progress/timeline?userId=xxx&subject=mathematics`
- Returns weekly snapshots of average mastery per subject
- Stored as materialized view or computed from `user_skills`

**Section C: Skill Overview**
```
┌─────────────────────────────────────┐
│  Skills by Subject                  │
│  🔢 Arithmetic: ████████░░ 80%     │
│  🔤 Algebra:    ████░░░░░░ 40%     │
│  📐 Geometry:   ██░░░░░░░░ 20%     │
│  ...                               │
│  [View All] → opens skill tree     │
└─────────────────────────────────────┘
```

**Badge System:**
| Badge | Trigger |
|-------|---------|
| 🔥 First Spark | Complete first session |
| ⭐ 7-Day Streak | Practice 7 consecutive days |
| ⭐ 30-Day Streak | Practice 30 consecutive days |
| 🧠 Subject Master | All children in subject ≥ 0.85 mastery |
| 🏆 Polymath | Achieve Subject Master in 3+ subjects |
| 💡 Aha! Moment | 10 successful breakthroughs logged |

**States:**
| State | Treatment |
|-------|-----------|
| Loading | Skeleton loader (3 panel placeholders) |
| Empty (new user) | "Start your first session to see progress here" |
| Streak active | Animated fire emoji, confetti on milestone |
| Streak broken | "Don't lose your streak! Practice today." gentle nudge |
| Error | "Couldn't load progress" with retry button |

### 7.2 Multi-Subject Skill Trees

**Priority:** 🔴 HIGH
**Effort:** 1 week
**Dependencies:** Skill tree infrastructure (done)
**Target:** Expand beyond math to cover core STEM subjects

#### Spec

**Subject Plan:**

| Subject | Root Skills | Children | Prereqs |
|---------|-------------|----------|---------|
| Physics | Mechanics, Thermodynamics, Waves & Optics, E&M, Modern Physics | 20 | Requires math (Algebra, Trig) |
| Chemistry | Atomic Structure, Bonding, Stoichiometry, Reactions, Organic | 18 | Requires Arithmetic |
| Biology | Cell Bio, Genetics, Evolution, Ecology, Human Physiology | 18 | None (beginner-friendly) |
| Programming | Python Basics, JS Basics, Data Structures, Algorithms | 16 | Requires CS Basics (done) |

**Database:** Add new rows to `skills` table (subject = 'physics', 'chemistry', etc.)

**UI Update:** Subject filter tabs at top of skill tree sidebar:
```
[ 🔢 Math ] [ ⚛ Physics ] [ 🧪 Chemistry ] [ 🧬 Biology ] [ 💻 CS ]
```

**Recommendation Scope:** Per-subject. Student can work on math AND programming simultaneously.

**API Update:** `GET /api/skills?userId=xxx&subject=physics`

### 7.3 Session Summary Modal

**Priority:** 🟡 MEDIUM
**Effort:** 1 day
**Dependencies:** None
**Target:** Immediate feedback loop when session ends

#### Spec

**Trigger:** User clicks "END SESSION"

**Modal Content:**
```
┌──────────────────────────────────────┐
│  Session Summary                     │
│                                      │
│  🎯 Linear Equations                  │
│  ┌────────────────────────────────┐  │
│  │ Mastery: 35% → 52% (+17%)     │  │
│  │ Struggles: 3  ✅ Breakthroughs: 1│  │
│  │ Duration: 12 min               │  │
│  │ Concepts: solving for x,       │  │
│  │  balancing equations            │  │
│  └────────────────────────────────┘  │
│                                      │
│  [📁 Save Replay]  [📊 View Progress]│
└──────────────────────────────────────┘
```

**Logic:**
- Calculate mastery delta by comparing `user_skills` before/after session
- Count struggles by querying `interventions` created during session
- Suggest next skill using recommendation engine

### 7.4 Enhanced Socratic Prompting

**Priority:** 🟡 MEDIUM
**Effort:** 2 days
**Dependencies:** Skill tree (done)

**Improvements:**
| Feature | Before | After |
|---------|--------|-------|
| Geometry awareness | "User drew shapes" | "User drew a triangle with angles 90°, 45°, 45° — sum is 180° ✓" |
| Difficulty adaptation | Same tone | "Since you've mastered basics, here's a harder problem..." |
| Context persistence | Each request stateless | Session memory (last 5 exchanges) |

**Implementation:**
- Add geometry analysis util: detect shape types, count sides, calculate known angles
- Track session history in memory (last 5 Q&A pairs)
- Inject difficulty level based on `skill.mastery_level`

---

## 8. Tier 2 — Growth Features (Detailed Specs)

### 8.1 Multiplayer Classrooms

**Priority:** 🟡 MEDIUM
**Effort:** 2 weeks
**Tech:** Supabase Realtime + Tldraw multiplayer (collaborative sync) OR custom WebSocket

**Flow:**
1. Teacher clicks "Create Classroom" → generates 6-digit code
2. Students navigate to `/classroom?room=ABC123` → joins
3. Teacher sees roster: active students, current skill, time in session
4. Teacher clicks "Push Problem" → problem appears on all student canvases
5. Student clicks "Raise Hand" → teacher dashboard shows request
6. Teacher ends class → all replays saved in bulk

**Schema Addition:**
```sql
CREATE TABLE classrooms (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES user_profiles(id),
  code TEXT UNIQUE NOT NULL, -- 6-digit
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE classroom_participants (
  id UUID PRIMARY KEY,
  classroom_id UUID REFERENCES classrooms(id),
  user_id UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now()
);
```

### 8.2 Parent Portal

**Priority:** 🟡 MEDIUM
**Effort:** 1 week
**Tech:** Next.js API + SendGrid / Resend for email

**Features:**
- Weekly digest email: "Your child practiced 4 days this week. Skills improved: Fractions (+15%), Decimals (+8%)."
- Web dashboard: graph of time spent vs. mastery gained
- Anonymous comparison: "Your child is in the top 25% of their class for Algebra."
- Notification when child has a breakthrough

### 8.3 Curriculum Alignment

**Priority:** 🔵 LOW
**Effort:** 1 week

**Schema Addition:**
```sql
CREATE TABLE curriculum_standards (
  id UUID PRIMARY KEY,
  authority TEXT NOT NULL, -- 'common_core', 'cbse', 'gcse'
  code TEXT NOT NULL, -- e.g. 'CCSS.MATH.CONTENT.8.EE.C.7'
  description TEXT
);

CREATE TABLE skill_standards (
  skill_id UUID REFERENCES skills(id),
  standard_id UUID REFERENCES curriculum_standards(id),
  PRIMARY KEY (skill_id, standard_id)
);
```

### 8.4 Dark Mode + Accessibility

**Priority:** 🟡 MEDIUM
**Effort:** 3 days
**Approach:** Tailwind `dark:` variant + CSS custom properties for theme

**Requirements:**
- System preference detection (`prefers-color-scheme`)
- Manual toggle in settings
- All components: landing, classroom, dashboard, replay, login
- High-contrast mode (WCAG AA compliant)
- Screen reader labels for canvas actions

---

## 9. Tier 3 — Scale Features (Detailed Specs)

### 9.1 LMS Integrations

**Priority:** 🔵 LOW (Enterprise)
**Effort:** 2-3 weeks per integration
**Standards:** LTI 1.3 (Learning Tools Interoperability)

**Integrations:**
| Platform | Method | Auth |
|----------|--------|------|
| Google Classroom | Google Workspace API | OAuth 2.0 |
| Canvas LMS | LTI 1.3 + Canvas API | API Key |
| Schoology | LTI 1.1 | API Key |
| Powerschool | LTI 1.3 | API Key |

**Features:**
- Roster sync (auto-create student accounts)
- Grade sync (skill mastery → LMS gradebook)
- Assignment creation (teacher creates Newton session from LMS)

### 9.2 Offline-First PWA

**Priority:** 🔵 LOW
**Effort:** 2-3 weeks
**Tech:** Next.js PWA (Service Worker) + IndexedDB

**Offline Capabilities:**
| Feature | Online | Offline | Sync |
|---------|--------|---------|------|
| Canvas drawing | ✅ | ✅ | On reconnect |
| Session recording | ✅ | ✅ (local) | On reconnect |
| AI tutoring | ✅ | ❌ (queued) | Queue for later |
| Skill progress | ✅ | ✅ (local) | On reconnect |
| Replay playback | ✅ | ✅ (cached) | N/A |

### 9.3 Mobile Native

**Priority:** 🔵 LOW
**Effort:** 3+ weeks
**Tech:** React Native / Expo

**MVP:** Canvas + text input + skill tree + progress dashboard
**Add-on:** Handwriting recognition (MyScript / Apple PencilKit)
**Push:** Streak reminders, teacher feedback, session summary

### 9.4 Fine-Tuned Socratic Model

**Priority:** 🔵 LOW (Cost Optimization)
**Effort:** 2 weeks + data collection

**Approach:**
1. Collect 10K Socratic dialogues from production usage
2. Fine-tune Llama-3.3-8b on Q/A format (question-only responses)
3. Deploy via vLLM or Ollama on self-hosted GPU
4. Fallback to Groq for edge cases

**Cost Impact:**
| Model | Cost per 1M tokens | Annual (10K sessions/mo) |
|-------|--------------------|--------------------------|
| Groq Llama-3.3-70b | $0.59 | ~$7,080 |
| Self-hosted fine-tune 8B | ~$0.02 (electricity) | ~$240 |

### 9.5 Enterprise Admin Dashboard

**Priority:** 🔵 LOW
**Effort:** 2 weeks

**Features:**
- Multi-school/district management
- Usage analytics: active students, sessions per day, most-practiced skills
- Teacher scorecard: student improvement rates by teacher
- SSO: SAML / OIDC (Google Workspace, Microsoft 365)
- Audit log for compliance
- CSV export for all reports

---

## 10. Platform & Architecture

### 10.1 Current Architecture

```
┌─────────────────────────────────────────────────┐
│  CLIENT LAYER                                    │
│  ┌──────────────────────────────────────────┐  │
│  │  Next.js 16 (App Router) + React 19      │  │
│  │  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────┐ │  │
│  │  │Tldraw│ │rrweb │ │Recharts│ │Lucide│ │  │
│  │  └──────┘ └──────┘ └────────┘ └──────┘ │  │
│  │  Tailwind CSS · Framer Motion               │  │
│  └──────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│  API LAYER (Next.js Route Handlers)              │
│  POST /api/chat-audio · POST /api/chat           │
│  GET  /api/skills · POST /api/skills/update      │
│  GET  /api/skills/recommendations · POST /api/tts│
│  GET  /api/dashboard/*                          │
├─────────────────────────────────────────────────┤
│  LLM LAYER                                      │
│  Groq Llama-3.3-70b (Socratic Engine)           │
│  Groq Whisper (Speech-to-Text)                  │
│  OpenRouter TTS or Browser SpeechSynthesis      │
├─────────────────────────────────────────────────┤
│  DATA LAYER                                     │
│  Supabase PostgreSQL · Auth · Realtime          │
│  Tables: user_profiles, session_replays,        │
│  skills, user_skills, skill_prerequisites,      │
│  interventions                                  │
└─────────────────────────────────────────────────┘
```

### 10.2 Future Architecture (Tier 3)

```
Additions:
├── LMS Gateway Service (LTI 1.3 proxy)
├── Session Queue (offline IndexedDB → sync worker)
├── Model Serving (vLLM for fine-tuned model)
├── CDN for replay assets (Cloudflare R2 / S3)
├── Redis for real-time classroom state
└── Monitoring (PostHog for product analytics, Sentry for errors)
```

### 10.3 Tech Stack Decisions

| Choice | Why |
|--------|-----|
| Next.js App Router | API routes + frontend in one deploy, Vercel-compatible |
| Tldraw over Excalidraw | Programmatic canvas API, shape JSON serialization |
| Groq over OpenAI | 10x faster inference (necessary for real-time Socratic) |
| Supabase over Firebase | Postgres-native, cheaper at scale, Realtime built-in |
| rrweb over custom recorder | Battle-tested, handles iframes + shadow DOM |
| Web Speech over LiveKit | Zero infrastructure, zero cost, zero latency |

---

## 11. Data Model Reference

### Current Tables

```sql
--- Auth (Managed by Supabase Auth)
auth.users
  - id UUID PRIMARY KEY
  - email TEXT
  - created_at TIMESTAMPTZ

--- User Profiles
user_profiles
  id UUID PK → auth.users
  role TEXT CHECK (student | teacher)
  name TEXT
  created_at TIMESTAMPTZ

--- Session Replays
session_replays
  id UUID PK
  user_id UUID → auth.users
  student_name TEXT
  concept TEXT
  events JSONB (rrweb event array)
  canvas_snapshot JSONB
  feedback TEXT (teacher notes)
  created_at TIMESTAMPTZ

--- Skills (Self-Referencing Tree)
skills
  id UUID PK
  name TEXT
  subject TEXT
  parent_id UUID → skills (nullable)
  difficulty INT (1-10)
  icon TEXT
  order_index INT
  description TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

--- Skill Dependencies (DAG)
skill_prerequisites
  skill_id UUID PK → skills
  requires_skill_id UUID PK → skills

--- User Skill Progress
user_skills
  id UUID PK
  user_id UUID → auth.users
  skill_id UUID → skills
  mastery_level NUMERIC(3,2)  (0.00 - 1.00)
  attempts INT
  successful_attempts INT
  last_practiced TIMESTAMPTZ
  created_at TIMESTAMPTZ
  UNIQUE (user_id, skill_id)

--- Interventions (Live Teacher Feed)
interventions
  id UUID PK
  user_id UUID → auth.users (nullable)
  student_name TEXT
  concept TEXT
  struggle TEXT
  breakthrough TEXT
  skill_id UUID → skills (nullable)
  created_at TIMESTAMPTZ
```

### Tables Needed (Tier 1-3)

```sql
--- Progress (Materialized or computed)
--- No new table needed — computed from user_skills + interventions

--- Curriculums
curriculum_standards
  id UUID PK
  authority TEXT (common_core | cbse | gcse)
  code TEXT
  description TEXT

skill_standards
  skill_id UUID PK → skills
  standard_id UUID PK → curriculum_standards

--- Classrooms (Tier 2)
classrooms
  id UUID PK
  teacher_id UUID → user_profiles
  code TEXT UNIQUE (6-digit)
  is_active BOOLEAN
  created_at TIMESTAMPTZ

classroom_participants
  id UUID PK
  classroom_id UUID → classrooms
  user_id UUID → auth.users
  joined_at TIMESTAMPTZ

--- Session Memory (Tier 2) - simplified, could use Redis
session_memory
  id UUID PK
  user_id UUID → auth.users
  session_id TEXT
  messages JSONB (last 5 Q&A)
  updated_at TIMESTAMPTZ
```

---

## 12. Success Metrics & KPIs

### Product Metrics

| Metric | Target (Monthly) | Measurement |
|--------|------------------|-------------|
| **DAU / MAU ratio** | > 40% | Auth sessions |
| **Session completion rate** | > 70% | Started vs. ended sessions |
| **Average session duration** | > 15 min | Session start → end |
| **Skill tree adoption** | > 60% of active users | Selected at least 1 skill |
| **Replay save rate** | > 30% of sessions | Replay saved / session ended |
| **Streak retention (7+ days)** | > 25% of users | Consecutive practice days |
| **Teacher DAU** | > 60% of registered teachers | Dashboard visits/week |

### Business Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Free → Pro conversion | 5% | 6 months post-launch |
| Teacher → classroom adoption | 10 students/teacher avg | 3 months |
| Net Promoter Score (NPS) | > 50 | Quarterly survey |
| Monthly recurring revenue | $10K MRR | 12 months post-launch |

### Quality Metrics

| Metric | Threshold |
|--------|-----------|
| Socratic answer rate (% questions-only) | > 95% (audited) |
| TTS latency | < 2s (OpenRouter) / instant (native) |
| STT accuracy | > 90% (Groq Whisper) |
| Canvas serialization latency | < 50ms |
| API p95 response time | < 3s (including LLM inference) |
| Uptime | > 99.5% (Vercel) |

---

## 13. Competitive Landscape

### Direct Competitors

| Product | Canvas | Socratic | Voice | Skill Tree | Open Source | Pricing |
|---------|--------|----------|-------|------------|-------------|---------|
| **Newton** | ✅ Tldraw | ✅ Enforced | ✅ VAD+Whisper | ✅ 30+ skills | ✅ MIT | Free + $20 Pro |
| Khanmigo | ❌ | ✅ Partial | ❌ | ✅ Khan Academy | ❌ | $44/mo |
| Socra | ❌ | ✅ | ❌ | ❌ | ❌ | Free + Pro |
| MathGPT.ai | ❌ | ❌ | ❌ | ✅ | ❌ | School license |
| Socratic (Google) | ❌ | ❌ | ✅ Text only | ❌ | ❌ | Free |
| DeepTutor | ❌ | ✅ Research | ❌ | ❌ | ❌ | Academic only |

### Newton's Wedge

| Advantage | Why It's Hard to Copy |
|-----------|----------------------|
| Canvas + Voice + AI | Integration complexity of 3 modalities |
| Socratic-by-design prompt engineering | Years of iteration on question-only output |
| Free voice pipeline (no LiveKit) | Most competitors pay $0.01+/min for voice |
| rrweb replays = trust | Teachers won't adopt without visibility |
| Browser-native | No app store, no install friction, works on Chromebooks |

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| LLM hallucinates / gives answer | Medium | High | `response_format: json_object`, post-processing filter, audit sampling |
| Browser SpeechSynthesis quality varies | High | Medium | OpenRouter TTS as primary, native as fallback |
| Students game the system (click through) | Medium | Medium | Session time minimums, intervention triggers, replay audit |
| Offline usage without sync | Medium | Medium | IndexedDB queue (Tier 3) |
| Supabase Realtime scale limit | Low (early) | High | Connection pooling, Redis for high-volume classrooms (Tier 3) |
| Canvas data privacy (student content) | Low | High | Row-level security by default, no data sharing, SOC2 in enterprise |
| Retention drops after novelty | High | High | Streak system, weekly goals, teacher assignments, badge progression |
| Mobile responsiveness for canvas | Medium | Medium | Touch handling in Tldraw, pinch-zoom, responsive toolbar |

---

## 15. Open Questions

1. **Should we offer an API for third-party content providers?** (e.g., textbook publishers upload problem sets → Newton tutors them)
2. **Should we support multiple languages from day one?** (Spanish, Hindi, French subtitles/TTS)
3. **What's the best pricing model for schools?** (Per-seat vs. site license vs. usage-based)
4. **Should we build a community problem bank?** (Students submit problems → curated → available to all)
5. **Should we support code execution for CS tutoring?** (In-browser Python/JS runner alongside canvas)

---

> **Next document to create:** Technical Architecture Guide (for developers contributing to Newton)

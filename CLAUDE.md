# DailyAgile Platform — Claude Code Master Context Library
# Version: 2.0 | July 2026
# Save as CLAUDE.md in your project root.
# Claude Code reads this automatically every session.
# ================================================================

---

## 🏢 BUSINESS CONTEXT

**Company:** DailyAgile
**Website:** dailyagile.com
**Owner:** tkiran204@gmail.com
**Tagline:** Accelerate Business Agility
**Mission:** Teach AI and Agile skills to business professionals and technical
students through interactive, practical, self-paced learning.

**Current business:**
- Instructor-Led Training (ILT) in AI + Agile — existing revenue stream
- Expanding into self-paced digital learning platform — THIS PROJECT

**Unique positioning:**
- Only provider combining AI technical skills WITH Agile delivery methodology
- Not videos — interactive AI classrooms powered by OpenMAIC
- Two tracks: business professionals (no-code) and technical students (labs)
- Warm existing student audience from ILT for first sales

---

## 🎯 TWO COURSE TRACKS

### Track A: AI for Business Professionals
Audience: Product managers, Scrum Masters, coaches, consultants, managers
Goal: AI literacy — no coding required
Price: £49–£99/module | £199–£299 full course

Modules:
1. What AI Actually Is (history, types, capabilities)
2. How AI Learns (ML, neural networks — business analogies)
3. Generative AI in Your Workplace (real tools, real outcomes)
4. Prompt Engineering for Professionals (prompt library)
5. AI Agents & Automation (Agentic AI, MCP, Hermes Agent)
6. AI Ethics & Governance (hallucination, bias, responsible use)

Bonus — AI Tools Masterclass (4 modules):
1. AI for Research & Analysis
2. AI for Content & Communication
3. AI for Project & Product Delivery
4. Building Your Team's AI Workflow

### Track B: AI Engineer Course
Audience: Developers, data scientists moving into AI
Goal: Production-ready AI engineering — Python, MLOps, RAG, agents
Price: £399–£599 | Source: Microsoft AI-For-Beginners (MIT) + Agile layer

Modules:
1. AI & ML Foundations (MS Repo Lessons 1–2)
2. Neural Networks Hands-On (MS Repo Lessons 3–5, Python notebooks)
3. Computer Vision in Practice (MS Repo Lessons 6–9)
4. NLP & LLMs (MS Repo Lessons 12–16)
5. Prompt Engineering & RAG (new content + Claude Code labs)
6. Agentic AI & MCP (Hermes Agent, tool calling)
7. MLOps & Deployment (MS Repo Lessons 17–21)
8. AI Product Delivery with Agile (sprints for AI, backlogs, retros)

### Track B: AI DevOps / MLOps Course
Audience: DevOps + cloud engineers adding AI/ML operations
Goal: Deploy, monitor, operate AI/ML systems in production
Price: £299–£499

Modules:
1. Containerising AI Models (Docker, model serving)
2. Kubernetes for ML Workloads (scaling inference, GPU nodes)
3. CI/CD for AI Pipelines (GitHub Actions, model testing)
4. Monitoring & Observability (model drift, Prometheus, Grafana)
5. Cloud AI Services (AWS SageMaker, Azure ML, GCP Vertex AI)
6. AIOps in Practice (AI-assisted troubleshooting, predictive scaling)

---

## 🛠️ FULL TECHNOLOGY STACK

### Claude Code Setup
- Model default: claude-haiku-4-5-20251001 (cost-efficient)
- Auth: Claude Pro account — subscription billing NOT API key billing
- Login: `claude login` → Option 1 (Claude account with subscription)
- Config: `claude config set model claude-haiku-4-5-20251001`
- Status check: run `/status` inside Claude Code session

### Core Platform
- OpenMAIC: github.com/THU-MAIC/OpenMAIC (AGPL-3.0)
  Interactive AI classroom engine — AI teachers, quizzes, simulations
  Deploy: Vercel (primary) or self-hosted
  LLM: Anthropic API (Claude Haiku for cost efficiency)
  Access control: ACCESS_CODE env var for paid course gating

### Curriculum Sources
- Microsoft AI-For-Beginners: github.com/microsoft/AI-For-Beginners (MIT)
  24 lessons, Jupyter Notebooks, built-in quiz app (quiz-app/ folder)
  Maps to Track B modules 1–7
- Hermes Agent: hermes-agent.nousresearch.com
  Used for Track A Module 5 and Track B Module 6 demos
  Runs locally on Mac, connects via Telegram/Slack/CLI
- Ollama: github.com/ollama/ollama
  Local LLM for privacy-sensitive lab environments
  Best models for 16GB Mac: Qwen 3.5/3.6 (9–14B range)
- LangChain: github.com/langchain-ai/langchain
  Track B Module 5 — RAG pipeline labs
- n8n: github.com/n8n-io/n8n
  Track B DevOps Module 6 — AI workflow automation demos

---

## 🎬 VIDEO PRODUCTION STACK

### 1. Remotion (Motion Graphics Videos)
What: React-based video framework — describe video in English, Claude
generates TypeScript code, Remotion renders to MP4. 150K installs in
8 weeks — #1 independent Claude Code skill on skills.sh.
Use for: Module intro videos, terminology animations, branded course
trailers, data visualisations, social media clips.
Commercial licence required for companies with 4+ employees (~£200/yr).
Cost: ~10–15 min per polished 30–60 second video.

Install skill:
  claude skills install remotion-best-practices

Setup:
  npm create video@latest dailyagile-videos
  cd dailyagile-videos && npm install
  npx remotion studio   # preview at localhost:3000

Example prompts for Claude Code:
  "Create a 30-second DailyAgile branded intro video for Module 1.
   Navy (#1E3A5F) background, teal (#0891B2) accents, Cambria font.
   Animated title 'What AI Actually Is', fade-in logo, tagline reveal."

  "Create a 60-second explainer showing how neural networks learn.
   Animated nodes connecting, data flowing through layers, with captions."

  "Create a 15-second social media teaser for LinkedIn promoting
   our AI for Business course. Include DailyAgile logo and CTA."

### 2. OpenMontage (Full Production Pipeline)
What: World's first open-source agentic video production system.
12 pipelines, 52 tools, 500+ agent skills. Claude Code IS the
orchestrator — reads YAML manifests and Markdown skills, calls
Python tools. Cost: ~$1.33 for a 60-second animated short.
Licence: AGPL-3.0 (self-hosted is fully compliant).

Pipelines available:
  explainer, talking-head, screen-demo, cinematic-trailer,
  animation, documentary-montage, podcast-repurpose,
  localization, corporate-training, social-clip, product-ad,
  pixar-style-animated-short

Tools included (52):
  Video gen: Kling, Runway Gen-4, Google Veo 3, WAN 2.1, Hunyuan,
             CogVideo, LTX-Video, Pexels, Pixabay, Wikimedia
  Image gen: FLUX, gpt-image-1, Recraft, DALL-E 3
  TTS:       ElevenLabs, Google TTS, OpenAI TTS, Piper (free/offline)
  Post:      FFmpeg, upscaling, color grading, face enhancement
  Analysis:  WhisperX transcription, scene detection, frame sampling
  Avatar:    Talking-head and lip-sync tools

Setup:
  git clone https://github.com/calesthio/OpenMontage.git
  cd OpenMontage && make setup
  cp .env.example .env
  # Open folder in Claude Code

Example prompts:
  "Make a 90-second explainer about RAG for our AI Engineer module.
   Animated diagrams, DailyAgile branding, Piper TTS voiceover,
   no paid APIs needed."

  "Create a 2-minute corporate training video for our Track A module.
   Professional presenter style, animated bullet points, DailyAgile logo."

  "Convert our Module 3 script into a talking-head video with
   AI avatar presenter. Export as MP4 for embedding in OpenMAIC."

  "Repurpose our 45-min ILT recording into 10 short social clips
   for LinkedIn and YouTube Shorts."

### When to use which:
  Remotion = fast, branded motion graphics, animated text, data viz
  OpenMontage = full production, real footage, voiceover, multi-scene

---

## 🔌 MCP CONNECTIONS

### Already Connected (active in claude.ai)
These MCPs are live — use them directly in Claude Code:

SUPABASE MCP
  URL: https://mcp.supabase.com/mcp
  Use for: student progress, quiz scores, certificates, migrations,
           edge functions, database queries
  Example: "Create progress tracking table for student module completions"
  Warning: Never connect to production DB from agent loop — use staging

GMAIL MCP
  URL: https://gmailmcp.googleapis.com/mcp/v1
  Use for: student welcome emails, progress nudges, cert delivery,
           corporate client follow-ups
  CRITICAL: Only use via dedicated forwarding address
            NEVER connect primary tkiran204@gmail.com inbox directly
            Create: support@dailyagile.com and forward selectively

GOOGLE CALENDAR MCP
  URL: https://calendarmcp.googleapis.com/mcp/v1
  Use for: ILT session scheduling, student reminder automation,
           cohort live session bookings, corporate demo scheduling

GOOGLE DRIVE MCP
  URL: https://drivemcp.googleapis.com/mcp/v1
  Use for: course content storage, student resource files
  CRITICAL: OAuth scope limited to /DailyAgile-Platform/ folder ONLY
            Never grant full Drive access

GAMMA MCP
  URL: https://mcp.gamma.app/mcp
  Use for: Auto-generate slide deck companion for each module,
           corporate pitch decks, student study guides
  Example: "Generate a 10-slide summary deck for Module 1 using
            our DailyAgile brand colours"

APOLLO.IO MCP
  URL: https://mcp.apollo.io/mcp
  Use for: Research corporate L&D prospects, find decision makers,
           build outreach lists for team licence sales
  Example: "Find L&D managers at UK tech companies with 200–1000
            employees for our corporate licence outreach"

### Install These MCPs (not yet connected)

ELEVENLABS MCP — Professional AI Voiceover
  What: Generate speech, clone voices, transcribe audio, manage
        conversational AI agents. Free tier: 10K credits/month.
  Use for: Professional narration for all module videos, clone your
           own voice for consistent instructor experience across modules

  Install in Claude Code:
    claude mcp add elevenlabs \
      -e ELEVENLABS_API_KEY="your_key" \
      -- npx elevenlabs-mcp-enhanced

  Or add to ~/.claude/claude_desktop_config.json:
    {
      "mcpServers": {
        "ElevenLabs": {
          "command": "npx",
          "args": ["elevenlabs-mcp-enhanced"],
          "env": { "ELEVENLABS_API_KEY": "your_key" }
        }
      }
    }

  Example prompts:
    "Clone my voice from this 3-minute recording sample"
    "Narrate the Module 1 script using my cloned voice, save as
     module-1-narration.mp3"
    "Generate audio for all 6 Track A module intros in my voice"

STRIPE MCP — Payment Management
  What: Query payments, create coupons, manage subscriptions,
        troubleshoot failed payments without opening Stripe dashboard.

  Install:
    claude mcp add stripe \
      -e STRIPE_SECRET_KEY="sk_live_..." \
      -- npx -y @stripe/mcp

  Example prompts:
    "Create a 50% off coupon for our launch promotion, expires 31 July"
    "Show all failed payments in the last 7 days"
    "Create a corporate team licence product for 20 seats at £5,000"

N8N MCP — Workflow Automation
  What: Build, validate, and run n8n workflows from a prompt.
        Multi-step automation connecting services without custom code.
  Use for: Stripe payment → Supabase record → Gmail welcome →
           Calendar invite — full student onboarding in one automation

  Self-hosted setup:
    docker run -d -p 5678:5678 n8nio/n8n

  Install MCP:
    claude mcp add n8n \
      -e N8N_BASE_URL="http://localhost:5678" \
      -e N8N_API_KEY="your_key" \
      -- npx -y @nicobailon/n8n-mcp-server

  Example automations to build:
    "Build automation: when Stripe payment succeeds → add student to
     Supabase → send Gmail welcome with ACCESS_CODE → add to Calendar"
    "Build automation: if student hasn't completed a module in 7 days
     → send Gmail nudge with their progress"
    "Build automation: when student passes all quizzes → generate
     certificate → email it → post to LinkedIn via CrossPost MCP"

CROSSPOST MCP — Social Media Publishing
  What: Post to X, Bluesky, LinkedIn, and Threads simultaneously.
        Claude adjusts format per platform automatically.

  Install:
    claude mcp add crosspost \
      -e CROSSPOST_API_KEY="your_key" \
      -e CROSSPOST_API_URL="https://postingly.io" \
      -- npx -y crosspost-mcp

  Example prompts:
    "Post today's AI terminology tip about 'Context Window' to all
     platforms. LinkedIn professional, X punchy, adapt for each."
    "Schedule 30 days of DailyAgile AI content from our 47-slide deck"

CONTEXT7 MCP — Live Documentation
  What: Injects real, version-specific documentation into every
        session. Prevents Claude Code using outdated API references.
  Use for: OpenMAIC, Next.js, Supabase, Stripe, ElevenLabs docs

  Install:
    claude mcp add context7 -- npx -y @upstash/context7-mcp

PLAYWRIGHT MCP — Browser Automation
  What: Automated browser testing and web scraping.
  Use for: Test student purchase flows, scrape competitor pricing,
           automated QA of platform pages

  Install:
    claude mcp add playwright \
      -- npx -y @playwright/mcp

---

## ⚡ CLAUDE CODE SKILLS TO INSTALL

Run these once to give Claude Code domain-specific expertise:

  # #1 most impactful for video content
  claude skills install remotion-best-practices

  # Frontend design for OpenMAIC customisation
  claude skills install frontend-design

  # Vercel deployment automation
  claude skills install vercel-react-best-practices

  # Web design system guidelines
  claude skills install web-design-guidelines

  # Azure AI for Track B DevOps modules
  claude skills install azure-ai

Verify installed skills:
  claude skills list

---

## 🤝 CLAUDE COWORK — FOR HEAVY TASKS

Use Claude Cowork (Cowork tab in Claude Desktop) for:
- Building an entire module from scratch (research → content → quiz → video)
- Generating 10+ videos in one session
- Full platform feature builds (auth system, payment flow, certificates)
- Long research tasks spanning many tool calls

Example Cowork prompts:
  "Research and write the complete Track A Module 4 — Prompt Engineering
   for Professionals. Include: lesson text (800 words), 5 quiz questions
   with answers, 3 real business use cases, a Remotion video script,
   and a Gamma slide deck prompt. Use DailyAgile branding throughout."

  "Build the complete student onboarding flow: Stripe checkout →
   Supabase record → Gmail welcome email → OpenMAIC ACCESS_CODE
   generation → n8n automation to trigger it all."

---

## 📁 PROJECT STRUCTURE

dailyagile-platform/
├── CLAUDE.md                    ← THIS FILE (auto-read by Claude Code)
├── .env.local                   ← All API keys (gitignored)
├── .gitignore
├── README.md
├── package.json
│
├── openMAIC/                    ← github.com/THU-MAIC/OpenMAIC
├── microsoft-ai-curriculum/     ← github.com/microsoft/AI-For-Beginners
├── OpenMontage/                 ← github.com/calesthio/OpenMontage
├── dailyagile-videos/           ← Remotion video project
│
├── content/
│   ├── track-a/                 ← Business professional modules
│   │   ├── module-1-what-is-ai/
│   │   │   ├── lesson.md
│   │   │   ├── quiz.json
│   │   │   ├── video-script.md
│   │   │   └── slides-prompt.md
│   │   ├── module-2-how-ai-learns/
│   │   ├── module-3-genai-workplace/
│   │   ├── module-4-prompt-engineering/
│   │   ├── module-5-agents-automation/
│   │   └── module-6-ethics-governance/
│   └── track-b/
│       ├── ai-engineer/         ← 8 modules (MS repo source)
│       └── ai-devops/           ← 6 modules (MLOps)
│
├── platform/
│   ├── auth/                    ← ACCESS_CODE + Supabase auth
│   ├── payments/                ← Stripe integration
│   ├── progress/                ← Student progress tracking
│   ├── certificates/            ← Certificate generation
│   └── admin/                   ← Admin dashboard
│
├── videos/
│   ├── remotion-compositions/   ← All Remotion video source files
│   └── openmontage-output/      ← Final rendered MP4s from OpenMontage
│
├── automations/
│   └── n8n-workflows/           ← Exported n8n workflow JSONs
│
└── assets/
    ├── dailyagile_logo.png
    ├── brand-colors.css
    └── email-templates/

---

## 🔑 ENVIRONMENT VARIABLES (.env.local)

# ── Claude / Anthropic ─────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_MODEL=claude-haiku-4-5-20251001

# ── OpenMAIC platform ──────────────────────────────────────────
ACCESS_CODE=<rotate-monthly-random-code>
MAX_TOKENS=1000

# ── Stripe ─────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_TRACK_A_PRICE_ID=price_...
STRIPE_TRACK_B_ENGINEER_PRICE_ID=price_...
STRIPE_TRACK_B_DEVOPS_PRICE_ID=price_...
STRIPE_BUNDLE_PRICE_ID=price_...

# ── Supabase ───────────────────────────────────────────────────
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# ── ElevenLabs ─────────────────────────────────────────────────
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=<your-cloned-voice-id>

# ── Video Production ───────────────────────────────────────────
# OpenMontage optional paid providers (all have free/local fallback)
RUNWAY_API_KEY=...           # optional — Pexels/Wikimedia is free
KLING_API_KEY=...            # optional
ELEVENLABS_API_KEY=...       # also used for TTS in OpenMontage

# ── Workflow Automation ────────────────────────────────────────
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=...

# ── Social Media ───────────────────────────────────────────────
CROSSPOST_API_KEY=...
CROSSPOST_API_URL=https://postingly.io

# ── Apollo.io ─────────────────────────────────────────────────
APOLLO_API_KEY=...

# ── App Config ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://dailyagile.com
NEXT_PUBLIC_BRAND_NAME=DailyAgile

---

## 🗄️ DATABASE SCHEMA (Supabase)

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  courses_purchased JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  course_id TEXT NOT NULL,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  course_id TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_url TEXT
);

CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  module_id TEXT NOT NULL,
  score INTEGER,
  answers JSONB,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE corporate_licences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation TEXT NOT NULL,
  contact_email TEXT,
  seats INTEGER,
  courses JSONB DEFAULT '[]',
  access_code TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

---

## 📚 MODULE MAPPING: MS REPO → TRACK B

Track B Module          | MS Repo Folder
------------------------|------------------------------------------
Module 1: AI Foundations| lessons/1-Intro/
Module 2: Neural Nets   | lessons/3-NeuralNetworks/
Module 3: Computer Vision| lessons/4-ComputerVision/
Module 4: NLP & LLMs   | lessons/5-NLP/
Module 5: RAG           | New content — content/track-b/ai-eng/m5/
Module 6: Agents & MCP | New content — content/track-b/ai-eng/m6/
Module 7: MLOps         | lessons/6-Other/
Module 8: AI + Agile    | Proprietary — content/track-b/ai-eng/m8/

---

## 🎨 BRAND & DESIGN

Colours (always use these hex values — no approximations):
  Navy:        #1E3A5F  (primary, headers, dark backgrounds)
  Teal:        #0891B2  (accent, links, highlights, buttons)
  Orange:      #EA580C  (CTAs, key emphasis, warnings)
  Light:       #F0F7FA  (card backgrounds, alternating rows)
  Dark:        #1E293B  (all body text)
  Gray:        #64748B  (secondary text, footers, metadata)
  White:       #FFFFFF  (page backgrounds, cards)

Typography:
  Headers:  Cambria Bold
  Body:     Calibri
  Code:     Courier New / monospace

Assets:
  Logo: assets/dailyagile_logo.png (1254×1254 PNG, white background)
  Tagline: "Accelerate Business Agility"

Tone of voice:
  - Plain English — no jargon for business track
  - Practical over theoretical — always real-world use cases
  - Business outcomes first — "what does this mean for your work?"
  - Warm and encouraging — learners may feel intimidated by AI

---

## 🔒 SECURITY RULES — ALWAYS FOLLOW

1. NEVER connect primary Gmail (tkiran204@gmail.com) to any agent
   Use dedicated address: support@dailyagile.com + forwarding filters

2. Client data (tax, financial, engagement notes) = local Ollama ONLY
   Never process sensitive client data through cloud LLMs

3. Student data stays in Supabase — never third-party analytics

4. API keys go in .env.local ONLY — never hardcode, never git commit

5. Google Drive OAuth: scope to /DailyAgile-Platform/ folder ONLY

6. Stripe webhooks: always verify signatures before processing

7. ACCESS_CODE: rotate monthly, never share in public repos

8. Supabase MCP: never connect to production from agent loop
   Always use staging/dev database in Claude Code sessions

9. Video content: always review OpenMontage output before publishing
   Agent approval gates exist — use them, don't skip them

.gitignore must always include:
  .env, .env.local, .env*.local, *.key, node_modules/,
  .claude/, videos/openmontage-output/*.mp4

---

## 💰 PRICING & REVENUE TARGETS

Product                    | Price           | Notes
---------------------------|-----------------|--------------------------------
Free taster (Track A)      | £0              | 2 modules, lead gen
Track A single module      | £49–£99         | Individual modules
Track A full course        | £199–£299       | All 6 + certificate
Track B AI Engineer        | £399–£599       | 8 modules + labs + portfolio
Track B AI DevOps          | £299–£499       | 6 modules + cloud labs
Bundle (both tracks)       | £599–£899       | Full certificate bundle
Corporate (5 seats)        | £1,500–£2,500   | Team licence + dashboard
Corporate (20 seats)       | £4,000–£6,000   | Enterprise + custom branding
ILT + Platform             | £2,000–£4,000pp | Premium cohort

Revenue targets: Year 1: £85–120K | Year 2: £220–320K | Year 3: £480–650K

---

## 📊 METRICS TO TRACK

Student: completion rate (>60%), quiz pass rate (>75%), NPS (>50)
Business: MRR, AOV (>£280), LTV (>£400)
Platform: session duration, API cost/student (<£0.05), response time

---

## ⚡ COMMON COMMANDS REFERENCE

PLATFORM SETUP:
  git clone https://github.com/THU-MAIC/OpenMAIC.git openMAIC
  git clone https://github.com/microsoft/AI-For-Beginners.git ms-ai
  git clone https://github.com/calesthio/OpenMontage.git
  cd openMAIC && pnpm install && pnpm dev
  cd OpenMontage && make setup

REMOTION VIDEOS:
  npm create video@latest dailyagile-videos
  cd dailyagile-videos && npm install
  npx remotion studio                          # preview
  npx remotion render src/Root MyComp out.mp4  # render

CLAUDE CODE SKILLS:
  claude skills install remotion-best-practices
  claude skills install frontend-design
  claude skills install vercel-react-best-practices
  claude skills install web-design-guidelines
  claude skills install azure-ai
  claude skills list                           # verify installed

MCP MANAGEMENT:
  claude mcp list                              # see all connected
  claude mcp add <name> ...                    # add new
  /mcp                                         # inside Claude Code session

STATUS CHECK (inside Claude Code):
  /status      → auth method, model, org
  /model       → switch model for this session
  /cost        → token usage this session
  /compact     → compress context when getting long

---

## 🚀 QUICK TASK REFERENCE

When asked to...                  | Do this...
----------------------------------|------------------------------------------
"Set up the platform"             | Clone OpenMAIC + MS repo, configure env,
                                  | deploy to Vercel
"Build module X"                  | Extract source → OpenMAIC lesson JSON →
                                  | quiz → video script → Gamma slides prompt
"Make a module intro video"       | Use Remotion skill, DailyAgile branding,
                                  | 30–60 seconds, navy/teal palette
"Make a full lesson video"        | Use OpenMontage explainer pipeline,
                                  | ElevenLabs or Piper TTS
"Add payment for [course]"        | Stripe Checkout → webhook →
                                  | ACCESS_CODE grant → Supabase record
"Student progress"                | Supabase progress table → dashboard
"Generate a quiz"                 | MS repo quiz-app OR generate from content
"Create a certificate"            | HTML template → PDF → Supabase URL
"Corporate dashboard"             | Team progress view → org filter → CSV
"Post to social media"            | CrossPost MCP → all platforms at once
"Email students"                  | Gmail MCP via support@dailyagile.com ONLY
"Research corporate prospects"    | Apollo.io MCP → L&D managers at target cos
"Generate slide deck"             | Gamma MCP with DailyAgile brand prompt
"Automate student onboarding"     | n8n MCP → Stripe→Supabase→Gmail→Calendar
"Clone my voice for narration"    | ElevenLabs MCP → voice clone → narrate
"Heavy multi-step task"           | Use Claude Cowork (Cowork tab)
"Update branding"                 | Navy/Teal/Orange + Cambria/Calibri always
"Local LLM for sensitive data"    | Ollama + Qwen 3.5 14B via OpenMAIC config
"Test the platform"               | Playwright MCP → automated browser tests

---

## 📅 12-MONTH ROADMAP

Month 1:  Validate & Pre-sell (10 pre-sales before building anything)
Month 2:  Platform foundation (OpenMAIC on Vercel + Stripe + Supabase)
Month 3:  Track A Module 1 launch + ElevenLabs voice clone
Month 4:  Track A full launch (6 modules) + Remotion video intros
Month 5:  Track B AI Eng modules 1–4 + OpenMontage lesson videos
Month 6:  Corporate sales (first 3 pitches) + Apollo.io outreach
Month 7:  Track B AI Eng complete (all 8 modules)
Month 8:  Track B DevOps modules 1–3 + cloud lab environment
Month 9:  Track B DevOps complete + MLOps certificate
Month 10: Certification launch + LinkedIn badge integration
Month 11: Scale marketing + CrossPost MCP social automation
Month 12: Year 2 planning + community launch

---

## 📝 SESSION NOTES (update as project evolves)

- Platform MVP: OpenMAIC on Vercel — not custom-built
- Validation first: 10 pre-sales before writing course content
- Haiku default model: 20x cheaper than Opus per token
- AGPL licence: self-hosted OpenMAIC is fully compliant
- MS repo MIT licence: free to fork, adapt, sell courses from it
- OpenMontage AGPL: self-hosted use is compliant
- Remotion: needs commercial licence for 4+ employee company
- Cloud lab credits: apply to AWS Educate + Azure for Students
- Video production: Remotion for intros, OpenMontage for full lessons
- Voice: ElevenLabs voice clone for consistent instructor experience
- Corporate pricing: quote annually (£5,000–£8,000/yr) not per-module
- Social: use CrossPost MCP for consistent daily LinkedIn/X presence

---

*DailyAgile Platform — CLAUDE.md v2.0 — July 2026*
*Single source of truth for all Claude Code sessions.*
*Update Session Notes section as decisions are made.*

# VINS — AI Internship Intelligence Platform
### Vicharanashala × IIT Ropar · Summership 2026

> **Not a chatbot. An AI-powered internship intelligence ecosystem.**
> RAG-grounded answers · Zero hallucinations · Self-improving knowledge base · Real-time confusion analytics

---

## 🏗️ Architecture Overview

```
User Question
     ↓
Search Similar FAQs in MongoDB (cosine similarity + text search)
     ↓
Retrieve Top-N Relevant FAQ Context
     ↓
Send ONLY relevant context to Gemini AI
     ↓
Generate controlled contextual response
     ↓
Display with Confidence Score + Source Citations (§X.X)
     ↓
Mentor-validated answers → added back to knowledge base (continuous learning)
```

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Tailwind CSS + Framer Motion |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| AI | Google Gemini API (gemini-2.0-flash-exp) |
| Auth | JWT + bcrypt |
| State | Zustand |
| Charts | Recharts |
| Icons | Lucide React |

---

## 📁 Project Structure

```
vins/
├── backend/
│   ├── models/          # MongoDB schemas
│   │   ├── User.js
│   │   ├── FAQ.js
│   │   ├── Query.js
│   │   └── Analytics.js
│   ├── routes/          # Express API routes
│   │   ├── auth.js
│   │   ├── ai.js        # RAG endpoint
│   │   ├── faq.js
│   │   ├── query.js
│   │   ├── analytics.js
│   │   └── announcements.js
│   ├── middleware/
│   │   └── auth.js      # JWT middleware
│   ├── utils/
│   │   ├── ragService.js  # Core RAG + Gemini integration
│   │   └── seedFAQ.js     # 50+ FAQ seed data
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Landing.jsx       # Public landing page
    │   │   ├── Login.jsx         # Auth pages
    │   │   ├── Home.jsx          # AI Intelligence Hub (main page)
    │   │   ├── AskAI.jsx         # RAG-powered AI chat
    │   │   ├── RaiseQuery.jsx    # Query posting with AI checks
    │   │   ├── Discussions.jsx   # Community Q&A feed
    │   │   ├── QueryDetail.jsx   # Full answer view
    │   │   ├── Analytics.jsx     # Confusion analytics dashboard
    │   │   ├── FAQBrowser.jsx    # Browse knowledge base
    │   │   ├── Announcements.jsx
    │   │   ├── Profile.jsx
    │   │   └── Settings.jsx
    │   ├── components/
    │   │   └── layout/
    │   │       └── Layout.jsx    # Sidebar + header
    │   ├── store/
    │   │   └── index.js          # Zustand stores
    │   ├── utils/
    │   │   └── api.js            # Axios instance
    │   └── styles/
    │       └── globals.css
    ├── package.json
    └── vite.config.js
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Google Gemini API key (free at https://aistudio.google.com)

### 1. Clone & Install

```bash
# Backend
cd vins/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Backend
cd vins/backend
cp .env.example .env
# Edit .env with your MongoDB URI and Gemini API key

# Frontend
cd ../frontend
cp .env.example .env
```

**Backend `.env`:**
```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/vins
JWT_SECRET=your_super_secret_key_min_32_chars
GEMINI_API_KEY=your_gemini_api_key
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 3. Seed the FAQ Database

```bash
cd vins/backend
npm run seed
# ✅ Seeded 50+ FAQ entries from the official Vicharanashala FAQ
```

### 4. Run Development Servers

```bash
# Terminal 1 — Backend
cd vins/backend
npm run dev
# 🚀 Running on http://localhost:5000

# Terminal 2 — Frontend
cd vins/frontend
npm run dev
# 🌐 Running on http://localhost:5173
```

### 5. Open & Login

Visit `http://localhost:5173`

Create an account or use:
- Sign up as `mentor` role to access knowledge base features
- Sign up as `student` for regular intern access

---

## 🌟 Key Differentiating Features

### 1. RAG Pipeline (Anti-hallucination)
```
POST /api/ai/ask
→ cosine similarity search across FAQ DB
→ top-5 FAQs retrieved
→ injected as context to Gemini
→ answer generated ONLY from that context
→ confidence score + §section citations returned
```

### 2. Confidence Scoring
- `High` (>35% combined similarity): Answer directly from FAQ
- `Medium` (15–35%): Partial FAQ match
- `Low` (<15%): Escalate to mentor

### 3. Continuous Learning Loop
```
Mentor posts answer → toggles "Add to Knowledge Base"
→ new FAQ entry created in MongoDB
→ future AI queries automatically use this answer
→ platform gets smarter with every validated answer
```

### 4. Confusion Analytics
- Category breakdown charts
- Confidence distribution (pie chart)
- Daily activity (area chart)
- Trending topics with progress bars
- FAQ gap detector (unanswered high-view queries)

### 5. Duplicate Detection
Before posting a query:
- Cosine similarity check against existing queries
- MongoDB text search for related FAQs
- Shows matches with similarity % before posting

---

## 🚢 Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy dist/ to Vercel
# Set VITE_API_URL=https://your-backend.onrender.com/api
```

### Backend → Render / Railway
```bash
# Set environment variables in Render dashboard
# Build command: npm install
# Start command: node server.js
```

### Database → MongoDB Atlas
- Create free M0 cluster
- Whitelist 0.0.0.0/0 for Render IPs
- Copy connection string to .env

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/ai/ask` | **Main RAG query** |
| POST | `/api/ai/refine` | AI question refinement |
| POST | `/api/ai/check-duplicate` | Pre-post duplicate check |
| GET | `/api/ai/daily-insight` | AI daily insight |
| GET | `/api/faq` | List FAQs with filters |
| GET | `/api/faq/trending` | Top FAQ by usage |
| GET | `/api/faq/categories` | Category stats |
| GET | `/api/queries` | List discussions |
| POST | `/api/queries` | Create query (auto-AI answer) |
| POST | `/api/queries/:id/answers` | Add answer + optional KB |
| POST | `/api/queries/:id/vote` | Vote on answer |
| GET | `/api/analytics/overview` | Platform stats |
| GET | `/api/analytics/category-breakdown` | Confusion by category |
| GET | `/api/analytics/trending-confusions` | Trending topics |
| GET | `/api/analytics/confidence-distribution` | AI confidence stats |
| GET | `/api/analytics/daily-activity` | Activity over time |
| GET | `/api/analytics/faq-gaps` | Unanswered topics (mentor) |

---

## 🎯 Demo Script (3 minutes)

**Minute 1 — The Problem**
> Open Analytics. "500+ interns, same questions repeated daily. 72% confused about ViBe progression. Mentors overwhelmed."

**Minute 2 — The Solution**
> Ask "Why are videos repeating on ViBe?"
> Show: confidence badge (High), source labels (§12.3, §12.15), cosine similarity scores.
> Say: *"We grounded the AI in real FAQ data — no hallucinations."*

**Minute 3 — The Differentiator**
> Post a new mentor answer → toggle "Add to Knowledge Base".
> Ask same question again.
> Show: AI now uses the new answer.
> Say: *"The platform learns. This is a self-improving intelligence ecosystem."*

**Closing:** *"We didn't build a chatbot. We built an intelligence ecosystem that reduces confusion, prevents hallucinations, and gets smarter every day."*

---

## 👥 Roles

| Role | Access |
|------|--------|
| Student | Ask AI, raise queries, answer, vote |
| Mentor | All above + Add answers to knowledge base, create FAQs, view FAQ gaps |
| Admin | All above + create announcements, delete content |

---

Built with ❤️ for Vicharanashala Summership 2026 · IIT Ropar

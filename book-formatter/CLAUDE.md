# Book Formatter

AI-powered manuscript formatter for KDP and IngramSpark publishing requirements.
Full stack app — React frontend, FastAPI backend.

## What this does
Author uploads DOCX manuscript via web interface. App sends text to Claude API 
with formatting rules. Returns formatted EPUB and PDF/X-1a files with change log 
and flags report. Download links delivered in browser.

## Stack
- React frontend (Vite)
- FastAPI backend
- Claude API for formatting intelligence
- Pandoc for EPUB generation
- ReportLab for PDF generation
- Supabase for file storage
- n8n for workflow orchestration (optional async processing)
- GitHub for version control

## Project structure
```
book-formatter/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.jsx
│   │   │   ├── ResultsPanel.jsx
│   │   │   ├── ChangeLog.jsx
│   │   │   └── ProgressIndicator.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   └── Results.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── processors/
│   ├── prompts/
│   └── utils/
├── CLAUDE.md
├── .env.example
└── README.md
```

## Environment variables
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
N8N_WEBHOOK_SECRET=
VITE_API_URL=http://localhost:8000
```

## Commands
```
# Backend
cd backend && pip install -r requirements.txt && python main.py

# Frontend
cd frontend && npm install && npm run dev
```

## Key files
- `prompts/formatting_system_prompt.txt` — paste the full KDP/IngramSpark formatting ruleset here
- `processors/claude_formatter.py` — sends text to Claude API, parses structured response
- `processors/epub_generator.py` — converts formatted markdown to EPUB via Pandoc
- `processors/pdf_generator.py` — converts formatted text to PDF/X-1a via ReportLab
- `routes/webhook.py` — n8n webhook receiver for async workflows

## Output
For each manuscript processed:
- `formatted_[title].epub`
- `formatted_[title].pdf`
- Change log returned in response JSON
All files stored in Supabase `book-formatter` bucket, download links returned to frontend.

## Future SaaS additions
- Supabase Auth for user accounts
- Stripe for payment gating
- Usage tracking per user/plan
- Admin dashboard
- White-label option for agencies
- Bundle with AI book launch outreach system

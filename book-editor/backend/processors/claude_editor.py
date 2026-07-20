import anthropic
import os
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

REFERENCE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "reference")

def load_reference(filename: str) -> str:
    path = os.path.join(REFERENCE_DIR, filename)
    if os.path.exists(path):
        return Path(path).read_text()
    return ""

def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def build_system_prompt(pass_number: int) -> str:
    claude_md = load_reference("CLAUDE.md")
    hard_rules = load_reference("hard-rules.md")
    voice_guide = load_reference("voice-guide.md")
    master_names = load_reference("master-names-list.md")
    series_bible = load_reference("series-bible.md")

    base = f"""You are the editorial AI for the Choose Me Series memoir by Allison Stivers. The following documents define your role, rules, and method. Follow them exactly.

=== CLAUDE.MD ===
{claude_md}

=== HARD RULES ===
{hard_rules}

=== VOICE GUIDE ===
{voice_guide}

=== MASTER NAMES LIST ===
{master_names}

=== SERIES BIBLE ===
{series_bible}

CRITICAL OUTPUT RULES:
- No em dashes (--) or en dashes (-) anywhere in your output. Use periods, commas, or rewrite.
- Return your response as valid JSON matching the schema specified for this pass.
- Never invent details not in the manuscript.
- Never rewrite never-touch items (Kenna letters, gut-punch endings, dark humor, embedded poetry).
"""

    pass_instructions = {
        0: """
=== PASS 0: INGEST ===
Read the chapter carefully. DO NOT EDIT anything. Produce:
1. A 250-350 word chapter summary (factual, no interpretation)
2. All continuity data: character details, ages, dates, locations, physical facts, objects that might recur
3. Any ambiguities that need Allie's input

Return JSON:
{
  "summary": "250-350 word summary",
  "continuity": "structured notes on characters, dates, locations, objects",
  "flags": ["list of questions for Allie"],
  "fixes": []
}
""",
        1: """
=== PASS 1: DEVELOPMENTAL + CONTINUITY ===
Assess structure, pacing, AND continuity. No rewrites. Flags and analysis only.

STRUCTURAL CHECK:
- Does the chapter earn its place (reveals something new OR costs something new)?
- Does the opening hook in the first two lines?
- Does the ending land? What is its emotional register?
- Is the reveal/cost distinct from neighboring chapters?
- Pacing issues?

CONTINUITY CHECK (cross-reference all prior chapter summaries provided):
- Pseudonyms correct (never reverted to real names)
- Ages, dates, locations consistent with prior chapters
- Physical details match earlier chapters
- Object continuity
- Callback accuracy
- Flag any contradictions between this chapter and prior summaries

Return JSON:
{
  "summary": "brief structural and continuity assessment",
  "edits_content": "full markdown-formatted analysis with structural FLAGS and continuity findings",
  "flags": ["list of structural and continuity issues requiring Allie's decision"],
  "fixes": [],
  "continuity": ""
}
""",
        2: """
=== PASS 2: LINE EDIT ===
Prose rhythm, clarity, redundancy, sentence-level craft. Voice guide is law.
For each change, use format: ORIGINAL / SUGGESTED / WHY
Classify every item as SUGGEST or FLAG. Never FIX in this pass.
Never touch: Kenna letters, gut-punch endings, dark humor, embedded poetry/journals.

Return JSON:
{
  "summary": "brief line edit summary",
  "edits_content": "full markdown with SUGGEST and FLAG items in ORIGINAL/SUGGESTED/WHY format",
  "flags": ["items flagged for Allie that you did not touch"],
  "fixes": [],
  "continuity": ""
}
""",
        3: """
=== PASS 3: COPYEDIT ===
Mechanical only: typos, punctuation, spelling, formatting consistency.
Fix autonomously. Log every change. Never reword for style.
Remove any em dashes or en dashes and log each removal.

Return JSON:
{
  "summary": "copyedit summary: X fixes made",
  "edits_content": "markdown listing every fix made",
  "flags": [],
  "fixes": ["every fix made, one line each with original and corrected text"],
  "continuity": ""
}
""",
        4: """
=== PASS 4: FORMATTING ===
Prepare the chapter for KDP and IngramSpark publication. Apply all formatting rules:
- Remove all em dashes and en dashes (replace with period, comma, or rewrite)
- Consistent chapter heading format
- Scene break markers (use # # # not asterisks)
- Paragraph indentation consistent (do not use blank lines between paragraphs in print)
- Dialogue punctuation correct (comma before closing quote if speech tag follows)
- No double spaces
- Ellipsis formatted correctly (three dots, space before and after if mid-sentence)
- Smart quotes consistent
- No widow/orphan headers (flag if chapter ends with fewer than 3 lines)
- EPUB accessibility: flag any images or non-text elements that need alt text
- Log every change made

Return JSON:
{
  "summary": "formatting summary: X changes made, ready for KDP/IngramSpark",
  "edits_content": "the fully formatted chapter text",
  "flags": ["anything requiring Allie's decision before final export"],
  "fixes": ["every formatting change made, one line each"],
  "continuity": ""
}
"""
    }

    return base + pass_instructions.get(pass_number, "")

async def run_pass(
    pass_number: int,
    chapter_file: str,
    chapter_text: str,
    prev_chapter_text: str = "",
    next_chapter_text: str = "",
    summaries_text: str = "",
    book_number: int = 1,
) -> dict:

    client = get_client()
    system_prompt = build_system_prompt(pass_number)

    user_message = f"""Book: {book_number}
Chapter file: {chapter_file}

"""
    if summaries_text:
        user_message += f"""CHAPTER SUMMARIES (for context):
{summaries_text[:3000]}

"""
    if prev_chapter_text:
        user_message += f"""PREVIOUS CHAPTER (excerpt):
{prev_chapter_text[:1500]}

"""
    if next_chapter_text:
        user_message += f"""NEXT CHAPTER (excerpt):
{next_chapter_text[:1500]}

"""

    user_message += f"""CHAPTER TO PROCESS:
{chapter_text}

Return valid JSON only. No em dashes or en dashes anywhere in your response."""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    raw = response.content[0].text.strip()

    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "summary": "Parse error -- raw output returned",
            "edits_content": raw,
            "flags": ["JSON parse failed -- review raw output"],
            "fixes": [],
            "continuity": "",
        }

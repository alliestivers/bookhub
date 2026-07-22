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

FLAGS — extremely strict rule: only flag a DIRECT INTERNAL CONTRADICTION within this single chapter that cannot be resolved without Allie's input. Most chapters will have zero flags. Maximum 2 per chapter.

A flag IS: two facts stated in THIS chapter that directly contradict each other (e.g. character described as alone, then someone else speaks with no introduction)
A flag IS NOT: name or pseudonym questions — the master names list is provided above, use it
A flag IS NOT: questions about callbacks or future chapters — you only know this chapter
A flag IS NOT: series bible or reference document notes
A flag IS NOT: details to log or track — put those in continuity notes
A flag IS NOT: anything resolvable in a later pass

Default to zero flags. Only flag if something is genuinely broken inside this chapter alone.

Return JSON:
{
  "summary": "250-350 word summary",
  "continuity": "structured notes on characters, dates, locations, objects — log potential callback details here silently",
  "flags": ["only direct contradictions requiring Allie's decision, max 2"],
  "fixes": []
}
""",
        1: """
=== PASS 1: DEVELOPMENTAL + CONTINUITY ===
Assess structure, pacing, AND continuity. No rewrites. Put analysis in edits_content.

STRUCTURAL CHECK (goes in edits_content):
- Does the chapter earn its place?
- Does the opening hook in the first two lines?
- Does the ending land?
- Pacing issues?

CONTINUITY CHECK (goes in edits_content):
- Pseudonyms correct
- Ages, dates, locations consistent with prior chapters
- Any contradictions between this chapter and prior summaries

FLAGS — strict rule: only flag a VERIFIED CONTRADICTION between two specific facts across chapters that Allie must resolve before line edits. Maximum 2 flags per chapter.

A flag IS: "Chapter 3 says Jade carried Allie up 11 flights, Chapter 7 says 8 flights — which is correct?"
A flag IS: "This chapter and Chapter 4 describe the same event with different outcomes — should one be cut?"
A flag IS NOT: pseudonym questions — the master names list handles that.
A flag IS NOT: series bible or reference document notes.
A flag IS NOT: style, voice, craft observations — put in edits_content.
A flag IS NOT: potential callbacks or details to track — put in edits_content.
A flag IS NOT: anything resolvable during line edits.

Return JSON:
{
  "summary": "brief structural and continuity assessment",
  "edits_content": "full markdown analysis — structural findings, continuity notes, craft observations",
  "flags": ["only genuine must-answer questions blocking line edits, max 3"],
  "fixes": [],
  "continuity": ""
}
""",
        2: """
=== PASS 2: LINE EDIT ===
Prose rhythm, clarity, redundancy, sentence-level craft. Voice guide is law.
Never FIX in this pass — only SUGGEST or FLAG.
Never touch: Kenna letters, gut-punch endings, dark humor, embedded poetry/journals.

Format EVERY item in edits_content exactly like this — no variations:

**SUGGEST**
ORIGINAL: exact original text
SUGGESTED: your suggested replacement
WHY: one sentence reason

**FLAG**
ORIGINAL: exact original text
SUGGESTED: possible alternative or leave blank
WHY: why this needs Allie's decision

Use **SUGGEST** for changes you recommend. Use **FLAG** for anything that needs Allie's input before changing.
Do not use numbered labels like S-01 or F-01. Use only **SUGGEST** or **FLAG** as the block header.

Return JSON:
{
  "summary": "brief line edit summary",
  "edits_content": "full markdown using only **SUGGEST** and **FLAG** blocks in the exact format above",
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

    import asyncio
    response = await asyncio.to_thread(
        client.messages.create,
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

    # Remove em dashes and en dashes that break JSON parsing
    raw = raw.replace('—', '-').replace('–', '-')

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Try extracting JSON from within the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                pass
        return {
            "summary": "Parse error -- raw output returned",
            "edits_content": raw,
            "flags": ["JSON parse failed -- review raw output"],
            "fixes": [],
            "continuity": "",
        }

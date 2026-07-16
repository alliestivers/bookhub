from docx import Document
import io
import re
import os

async def ingest_manuscript(file_path: str) -> str:
    if file_path.endswith(".docx"):
        doc = Document(file_path)
        lines = []
        for para in doc.paragraphs:
            if para.text.strip():
                style = para.style.name
                if "Heading 1" in style:
                    lines.append(f"\n# {para.text}\n")
                elif "Heading 2" in style:
                    lines.append(f"\n## {para.text}\n")
                else:
                    lines.append(para.text)
        return "\n".join(lines)
    elif file_path.endswith(".md") or file_path.endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

def split_chapters(text: str) -> list[dict]:
    chapter_pattern = re.compile(r'^# (.+)$', re.MULTILINE)
    matches = list(chapter_pattern.finditer(text))

    if not matches:
        return [{"filename": "ch-001-full-manuscript.md", "text": text, "heading": "Full Manuscript", "ambiguous": False, "is_kenna": False}]

    chapters = []
    for i, match in enumerate(matches):
        heading = match.group(1).strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        chapter_text = text[start:end].strip()

        slug = re.sub(r'[^a-z0-9]+', '-', heading.lower()).strip('-')[:40]
        is_kenna = any(word in heading.lower() for word in ['kenna', 'letter', 'dear kenna'])
        filename = f"ch-{str(i+1).zfill(3)}-{'letter-' if is_kenna else ''}{slug}.md"

        chapters.append({
            "filename": filename,
            "text": chapter_text,
            "heading": heading,
            "ambiguous": False,
            "is_kenna": is_kenna,
        })

    return chapters

def get_chapter_list(chapters_dir: str) -> list[dict]:
    chapters = []
    for filename in sorted(os.listdir(chapters_dir)):
        if filename.endswith(".md"):
            path = os.path.join(chapters_dir, filename)
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            word_count = len(text.split())
            first_line = text.split('\n')[0].replace('#', '').strip()
            is_kenna = "letter" in filename
            chapters.append({
                "filename": filename,
                "heading": first_line,
                "word_count": word_count,
                "is_kenna": is_kenna,
            })
    return chapters

def get_word_count(text: str) -> int:
    return len(text.split())

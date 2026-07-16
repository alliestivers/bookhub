from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from processors.manuscript_processor import ingest_manuscript, split_chapters, get_chapter_list, get_word_count
import os

router = APIRouter(prefix="/manuscript")

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")

@router.post("/upload")
async def upload_manuscript(
    file: UploadFile = File(...),
    book_number: int = Form(default=1)
):
    book_dir = os.path.join(WORKSPACE, f"book-{book_number}")
    source_dir = os.path.join(book_dir, "source")
    os.makedirs(source_dir, exist_ok=True)

    content = await file.read()
    source_path = os.path.join(source_dir, file.filename)
    with open(source_path, "wb") as f:
        f.write(content)

    text = await ingest_manuscript(source_path)
    chapters = split_chapters(text)

    chapters_dir = os.path.join(book_dir, "chapters")
    os.makedirs(chapters_dir, exist_ok=True)

    saved = []
    ambiguous = []
    for i, ch in enumerate(chapters):
        if ch.get("ambiguous"):
            ambiguous.append({"index": i, "heading": ch.get("heading", ""), "preview": ch["text"][:200]})
        else:
            filename = ch["filename"]
            filepath = os.path.join(chapters_dir, filename)
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(ch["text"])
            saved.append({"filename": filename, "word_count": len(ch["text"].split()), "is_kenna": ch.get("is_kenna", False)})

    total_words = sum(c["word_count"] for c in saved)

    return {
        "chapters": saved,
        "total_chapters": len(saved),
        "total_words": total_words,
        "ambiguous_boundaries": ambiguous,
        "source_file": file.filename,
    }

@router.get("/chapters/{book_number}")
async def list_chapters(book_number: int = 1):
    chapters_dir = os.path.join(WORKSPACE, f"book-{book_number}", "chapters")
    if not os.path.exists(chapters_dir):
        return {"chapters": []}
    chapters = get_chapter_list(chapters_dir)
    return {"chapters": chapters}

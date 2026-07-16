from fastapi import APIRouter
import os

router = APIRouter(prefix="/workspace")

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")

@router.get("/status/{book_number}")
async def get_status(book_number: int = 1):
    logs_dir = os.path.join(WORKSPACE, f"book-{book_number}", "logs")
    result = {}

    for filename in ["status.md", "decisions-log.md", "questions-for-allie.md", "continuity-log.md"]:
        path = os.path.join(logs_dir, filename)
        if os.path.exists(path):
            with open(path, "r") as f:
                result[filename.replace(".md", "").replace("-", "_")] = f.read()
        else:
            result[filename.replace(".md", "").replace("-", "_")] = ""

    return result

@router.get("/edits/{book_number}/{chapter}")
async def get_edits(book_number: int, chapter: str):
    edits_dir = os.path.join(WORKSPACE, f"book-{book_number}", "edits")
    files = []
    if os.path.exists(edits_dir):
        for f in os.listdir(edits_dir):
            if chapter.replace(".md", "") in f:
                path = os.path.join(edits_dir, f)
                with open(path, "r") as fh:
                    files.append({"filename": f, "content": fh.read()})
    return {"edits": files}

@router.get("/chapter/{book_number}/{filename}")
async def get_chapter(book_number: int, filename: str):
    chapter_path = os.path.join(WORKSPACE, f"book-{book_number}", "chapters", filename)
    if not os.path.exists(chapter_path):
        return {"content": ""}
    with open(chapter_path, "r") as f:
        return {"content": f.read(), "filename": filename}

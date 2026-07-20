from fastapi import APIRouter
import os
import json

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

@router.get("/chapter-results/{book_number}/{filename}")
async def get_chapter_results(book_number: int, filename: str):
    book_dir = os.path.join(WORKSPACE, f"book-{book_number}")
    summaries_dir = os.path.join(book_dir, "summaries")
    edits_dir = os.path.join(book_dir, "edits")
    flags_dir = os.path.join(book_dir, "flags")
    logs_dir = os.path.join(book_dir, "logs")

    results_by_pass = {}

    summary_path = os.path.join(summaries_dir, filename)
    if os.path.exists(summary_path):
        with open(summary_path, "r") as f:
            summary_text = f.read()
        continuity = ""
        cont_path = os.path.join(logs_dir, "continuity-log.md")
        if os.path.exists(cont_path):
            with open(cont_path, "r") as f:
                full_cont = f.read()
            marker = f"## {filename}"
            if marker in full_cont:
                section = full_cont.split(marker, 1)[1]
                continuity = section.split("\n## ")[0].strip()
        flags = []
        flag_path = os.path.join(flags_dir, f"{filename.replace('.md','')}-pass0.json")
        if os.path.exists(flag_path):
            with open(flag_path, "r") as f:
                flags = json.loads(f.read())
        results_by_pass[0] = {
            "results": [{"chapter": filename, "output": {
                "summary": summary_text,
                "continuity": continuity,
                "flags": flags,
                "fixes": [],
                "edits_content": "",
            }}],
            "pass": 0
        }

    for pass_num in [1, 2, 3, 4]:
        edit_path = os.path.join(edits_dir, f"{filename.replace('.md','')}-pass{pass_num}.md")
        if os.path.exists(edit_path):
            with open(edit_path, "r") as f:
                content = f.read()
            flags = []
            flag_path = os.path.join(flags_dir, f"{filename.replace('.md','')}-pass{pass_num}.json")
            if os.path.exists(flag_path):
                with open(flag_path, "r") as f:
                    flags = json.loads(f.read())
            results_by_pass[pass_num] = {
                "results": [{"chapter": filename, "output": {
                    "summary": "",
                    "edits_content": content,
                    "flags": flags,
                    "fixes": [],
                    "continuity": "",
                }}],
                "pass": pass_num
            }

    completed_passes = sorted(results_by_pass.keys())
    return {"completed_passes": completed_passes, "results_by_pass": results_by_pass}

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

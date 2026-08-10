from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from processors.claude_editor import run_pass
import os
import asyncio

router = APIRouter(prefix="/pass")

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")

# Shared progress state for run-all jobs
_run_all_progress = {}

def get_divider_filenames(book_number: int) -> set:
    manifest_path = os.path.join(WORKSPACE, f"book-{book_number}", "logs", "chapter-manifest.json")
    if not os.path.exists(manifest_path):
        return set()
    import json
    with open(manifest_path, "r") as f:
        manifest = json.load(f)
    return {ch["filename"] for ch in manifest.get("chapters", []) if ch.get("type") == "divider"}

class PassRequest(BaseModel):
    book_number: int = 1
    pass_number: int
    chapter_filename: str = ""
    chapter_range: list[str] = []
    skip_existing: bool = False

@router.post("/run")
async def run_editing_pass(req: PassRequest):
    book_dir = os.path.join(WORKSPACE, f"book-{req.book_number}")
    chapters_dir = os.path.join(book_dir, "chapters")
    summaries_dir = os.path.join(book_dir, "summaries")
    edits_dir = os.path.join(book_dir, "edits")
    flags_dir = os.path.join(book_dir, "flags")
    logs_dir = os.path.join(book_dir, "logs")

    for d in [summaries_dir, edits_dir, flags_dir, logs_dir]:
        os.makedirs(d, exist_ok=True)

    if not os.path.exists(chapters_dir):
        raise HTTPException(status_code=400, detail="No chapters found. Upload manuscript first.")

    targets = []
    if req.chapter_filename:
        targets = [req.chapter_filename]
    elif req.chapter_range:
        targets = req.chapter_range
    else:
        divider_filenames = get_divider_filenames(req.book_number)
        targets = sorted(os.listdir(chapters_dir))
        targets = [t for t in targets if t.endswith(".md") and t not in divider_filenames]

    results = []
    for chapter_file in targets:
        chapter_path = os.path.join(chapters_dir, chapter_file)
        if not os.path.exists(chapter_path):
            results.append({"chapter": chapter_file, "error": "File not found"})
            continue

        with open(chapter_path, "r", encoding="utf-8") as f:
            chapter_text = f.read()

        prev_text = ""
        next_text = ""
        divider_filenames = get_divider_filenames(req.book_number)
        all_chapters = sorted([c for c in os.listdir(chapters_dir) if c.endswith(".md") and c not in divider_filenames])
        idx = all_chapters.index(chapter_file) if chapter_file in all_chapters else -1
        if idx > 0:
            with open(os.path.join(chapters_dir, all_chapters[idx - 1]), "r") as f:
                prev_text = f.read()[:2000]
        if idx < len(all_chapters) - 1:
            with open(os.path.join(chapters_dir, all_chapters[idx + 1]), "r") as f:
                next_text = f.read()[:2000]

        summaries_text = ""
        if os.path.exists(summaries_dir):
            prior_chapters = all_chapters[:idx] if idx >= 0 else all_chapters
            for s in sorted(prior_chapters):
                s_path = os.path.join(summaries_dir, s)
                if os.path.exists(s_path):
                    with open(s_path, "r") as f:
                        summaries_text += f"\n\n--- {s} ---\n" + f.read()

        continuity_text = ""
        cont_path = os.path.join(logs_dir, "continuity-log.md")
        if os.path.exists(cont_path):
            with open(cont_path, "r", encoding="utf-8") as f:
                continuity_text = f.read()

        output = await run_pass(
            pass_number=req.pass_number,
            chapter_file=chapter_file,
            chapter_text=chapter_text,
            prev_chapter_text=prev_text,
            next_chapter_text=next_text,
            summaries_text=summaries_text,
            continuity_text=continuity_text,
            book_number=req.book_number,
        )

        if req.pass_number == 0:
            summary_path = os.path.join(summaries_dir, chapter_file)
            with open(summary_path, "w", encoding="utf-8") as f:
                f.write(output.get("summary", ""))

        if req.pass_number in [1, 2, 3, 4]:
            edit_path = os.path.join(edits_dir, f"{chapter_file.replace('.md','')}-pass{req.pass_number}.md")
            with open(edit_path, "w", encoding="utf-8") as f:
                f.write(output.get("edits_content", ""))

        if req.pass_number in [3, 4] and output.get("edits_content"):
            backup_dir = os.path.join(book_dir, "backups")
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(backup_dir, f"{chapter_file.replace('.md','')}-before-pass{req.pass_number}.md")
            with open(backup_path, "w", encoding="utf-8") as f:
                f.write(chapter_text)
            with open(chapter_path, "w", encoding="utf-8") as f:
                f.write(output["edits_content"])

        if output.get("fixes"):
            decisions_path = os.path.join(logs_dir, "decisions-log.md")
            with open(decisions_path, "a", encoding="utf-8") as f:
                for fix in output["fixes"]:
                    f.write(f"\n- [{chapter_file}] Pass {req.pass_number}: {fix}")

        import json as _json
        flag_path = os.path.join(flags_dir, f"{chapter_file.replace('.md','')}-pass{req.pass_number}.json")
        with open(flag_path, "w", encoding="utf-8") as f:
            f.write(_json.dumps(output.get("flags", [])))
        if output.get("flags"):
            questions_path = os.path.join(logs_dir, "questions-for-allie.md")
            with open(questions_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n## {chapter_file}\n")
                for flag in output["flags"]:
                    f.write(f"\n- {flag}")

        if req.pass_number == 0 and output.get("continuity"):
            cont_path = os.path.join(logs_dir, "continuity-log.md")
            with open(cont_path, "a", encoding="utf-8") as f:
                f.write(f"\n\n## {chapter_file}\n{output['continuity']}")

        _update_status(logs_dir, req.book_number, req.pass_number, chapter_file)
        results.append({"chapter": chapter_file, "output": output})

    return {"results": results, "pass": req.pass_number}

@router.post("/run-all")
async def run_all_chapters(req: PassRequest, background_tasks: BackgroundTasks):
    book_dir = os.path.join(WORKSPACE, f"book-{req.book_number}")
    chapters_dir = os.path.join(book_dir, "chapters")
    if not os.path.exists(chapters_dir):
        raise HTTPException(status_code=400, detail="No chapters found.")
    divider_filenames = get_divider_filenames(req.book_number)
    all_chapters = sorted([c for c in os.listdir(chapters_dir) if c.endswith(".md") and c not in divider_filenames])
    if req.skip_existing:
        if req.pass_number == 0:
            check_dir = os.path.join(WORKSPACE, f"book-{req.book_number}", "summaries")
            all_chapters = [c for c in all_chapters if not os.path.exists(os.path.join(check_dir, c))]
        else:
            edits_dir = os.path.join(WORKSPACE, f"book-{req.book_number}", "edits")
            all_chapters = [c for c in all_chapters if not os.path.exists(
                os.path.join(edits_dir, f"{c.replace('.md','')}-pass{req.pass_number}.md"))]
    job_id = f"book{req.book_number}-pass{req.pass_number}"
    _run_all_progress[job_id] = {"current": 0, "total": len(all_chapters), "current_name": "", "done": False}
    background_tasks.add_task(_run_all_background, req, all_chapters, job_id)
    return {"job_id": job_id, "total": len(all_chapters)}

@router.get("/run-all/progress/{job_id}")
async def get_run_all_progress(job_id: str):
    return _run_all_progress.get(job_id, {"error": "Job not found"})

async def _run_all_background(req: PassRequest, all_chapters: list, job_id: str):
    book_dir = os.path.join(WORKSPACE, f"book-{req.book_number}")
    chapters_dir = os.path.join(book_dir, "chapters")
    summaries_dir = os.path.join(book_dir, "summaries")
    edits_dir = os.path.join(book_dir, "edits")
    flags_dir = os.path.join(book_dir, "flags")
    logs_dir = os.path.join(book_dir, "logs")
    for d in [summaries_dir, edits_dir, flags_dir, logs_dir]:
        os.makedirs(d, exist_ok=True)

    for i, chapter_file in enumerate(all_chapters):
        _run_all_progress[job_id]["current"] = i + 1
        _run_all_progress[job_id]["current_name"] = chapter_file
        chapter_path = os.path.join(chapters_dir, chapter_file)
        if not os.path.exists(chapter_path):
            continue
        try:
            with open(chapter_path, "r", encoding="utf-8") as f:
                chapter_text = f.read()
            prev_text = ""
            next_text = ""
            if i > 0:
                with open(os.path.join(chapters_dir, all_chapters[i - 1]), "r") as f:
                    prev_text = f.read()[:2000]
            if i < len(all_chapters) - 1:
                with open(os.path.join(chapters_dir, all_chapters[i + 1]), "r") as f:
                    next_text = f.read()[:2000]
            summaries_text = ""
            if os.path.exists(summaries_dir):
                for s in all_chapters[:i]:
                    s_path = os.path.join(summaries_dir, s)
                    if os.path.exists(s_path):
                        with open(s_path, "r") as f:
                            summaries_text += f"\n\n--- {s} ---\n" + f.read()
            continuity_text = ""
            cont_path = os.path.join(logs_dir, "continuity-log.md")
            if os.path.exists(cont_path):
                with open(cont_path, "r", encoding="utf-8") as f:
                    continuity_text = f.read()
            output = await run_pass(
                pass_number=req.pass_number,
                chapter_file=chapter_file,
                chapter_text=chapter_text,
                prev_chapter_text=prev_text,
                next_chapter_text=next_text,
                summaries_text=summaries_text,
                continuity_text=continuity_text,
                book_number=req.book_number,
            )
            if req.pass_number == 0:
                with open(os.path.join(summaries_dir, chapter_file), "w", encoding="utf-8") as f:
                    f.write(output.get("summary", ""))
            if req.pass_number in [1, 2, 3, 4]:
                edit_path = os.path.join(edits_dir, f"{chapter_file.replace('.md','')}-pass{req.pass_number}.md")
                with open(edit_path, "w", encoding="utf-8") as f:
                    f.write(output.get("edits_content", ""))
            if req.pass_number in [3, 4] and output.get("edits_content"):
                backup_dir = os.path.join(book_dir, "backups")
                os.makedirs(backup_dir, exist_ok=True)
                backup_path = os.path.join(backup_dir, f"{chapter_file.replace('.md','')}-before-pass{req.pass_number}.md")
                with open(backup_path, "w", encoding="utf-8") as f:
                    f.write(chapter_text)
                with open(chapter_path, "w", encoding="utf-8") as f:
                    f.write(output["edits_content"])
            if output.get("fixes"):
                with open(os.path.join(logs_dir, "decisions-log.md"), "a", encoding="utf-8") as f:
                    for fix in output["fixes"]:
                        f.write(f"\n- [{chapter_file}] Pass {req.pass_number}: {fix}")
            import json as _json
            flag_path = os.path.join(flags_dir, f"{chapter_file.replace('.md','')}-pass{req.pass_number}.json")
            with open(flag_path, "w", encoding="utf-8") as f:
                f.write(_json.dumps(output.get("flags", [])))
            if output.get("flags"):
                with open(os.path.join(logs_dir, "questions-for-allie.md"), "a", encoding="utf-8") as f:
                    f.write(f"\n\n## {chapter_file}\n")
                    for flag in output["flags"]:
                        f.write(f"\n- {flag}")
            if req.pass_number == 0 and output.get("continuity"):
                with open(os.path.join(logs_dir, "continuity-log.md"), "a", encoding="utf-8") as f:
                    f.write(f"\n\n## {chapter_file}\n{output['continuity']}")
            _update_status(logs_dir, req.book_number, req.pass_number, chapter_file)
        except Exception as e:
            _run_all_progress[job_id]["current_name"] = f"{chapter_file} (error: {str(e)[:50]})"
    _run_all_progress[job_id]["done"] = True

def _update_status(logs_dir, book_number, pass_number, last_chapter):
    status_path = os.path.join(logs_dir, "status.md")
    pass_names = {0: "Ingest", 1: "Developmental", 2: "Line Edit", 3: "Copyedit", 4: "Formatting"}
    with open(status_path, "w", encoding="utf-8") as f:
        f.write(f"""# STATUS
Current book: {book_number}
Current pass: {pass_number} ({pass_names.get(pass_number, '')})
Last completed: {last_chapter}
Next action: continue Pass {pass_number} or advance to Pass {pass_number + 1}
""")

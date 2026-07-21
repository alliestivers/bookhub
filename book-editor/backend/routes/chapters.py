from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import shutil

router = APIRouter(prefix="/chapters")

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")


def get_book_dir(book_number: int) -> str:
    return os.path.join(WORKSPACE, f"book-{book_number}")


def get_manifest_path(book_number: int) -> str:
    return os.path.join(get_book_dir(book_number), "logs", "chapter-manifest.json")


def load_or_create_manifest(book_number: int) -> dict:
    manifest_path = get_manifest_path(book_number)
    if os.path.exists(manifest_path):
        with open(manifest_path, "r") as f:
            return json.load(f)

    # Generate from sorted filenames
    chapters_dir = os.path.join(get_book_dir(book_number), "chapters")
    chapters = []
    if os.path.exists(chapters_dir):
        filenames = sorted(f for f in os.listdir(chapters_dir) if f.endswith(".md"))
        for i, filename in enumerate(filenames):
            display_name = os.path.splitext(filename)[0].replace("-", " ").replace("_", " ")
            chapters.append({"filename": filename, "display_name": display_name, "order": i})

    return {"chapters": chapters}


def save_manifest(book_number: int, manifest: dict):
    manifest_path = get_manifest_path(book_number)
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)


@router.get("/{book_number}")
async def list_chapters(book_number: int):
    book_dir = get_book_dir(book_number)
    chapters_dir = os.path.join(book_dir, "chapters")
    summaries_dir = os.path.join(book_dir, "summaries")
    edits_dir = os.path.join(book_dir, "edits")

    manifest = load_or_create_manifest(book_number)
    chapters = manifest.get("chapters", [])

    # Build set of existing chapter files for metadata
    existing_files = set()
    if os.path.exists(chapters_dir):
        existing_files = {f for f in os.listdir(chapters_dir) if f.endswith(".md")}

    result = []
    for ch in chapters:
        filename = ch["filename"]
        stem = os.path.splitext(filename)[0]
        has_summary = os.path.exists(os.path.join(summaries_dir, filename)) if os.path.exists(summaries_dir) else False
        has_p1_edit = os.path.exists(os.path.join(edits_dir, f"{stem}-pass1.md")) if os.path.exists(edits_dir) else False
        has_p2_edit = os.path.exists(os.path.join(edits_dir, f"{stem}-pass2.md")) if os.path.exists(edits_dir) else False
        result.append({
            "filename": filename,
            "display_name": ch.get("display_name", stem),
            "order": ch.get("order", 0),
            "has_summary": has_summary,
            "has_p1_edit": has_p1_edit,
            "has_p2_edit": has_p2_edit,
        })

    return result


class ManifestBody(BaseModel):
    chapters: List[dict]


@router.post("/{book_number}/manifest")
async def save_manifest_endpoint(book_number: int, body: ManifestBody):
    save_manifest(book_number, {"chapters": body.chapters})
    return {"ok": True}


class RenameBody(BaseModel):
    filename: str
    display_name: str


@router.post("/{book_number}/rename-display")
async def rename_display(book_number: int, body: RenameBody):
    manifest = load_or_create_manifest(book_number)
    for ch in manifest.get("chapters", []):
        if ch["filename"] == body.filename:
            ch["display_name"] = body.display_name
            break
    save_manifest(book_number, manifest)
    return {"ok": True}


@router.delete("/{book_number}/{filename}")
async def delete_chapter(book_number: int, filename: str):
    book_dir = get_book_dir(book_number)
    stem = os.path.splitext(filename)[0]

    # Delete chapter file
    chapter_path = os.path.join(book_dir, "chapters", filename)
    if os.path.exists(chapter_path):
        os.remove(chapter_path)

    # Delete summary
    summary_path = os.path.join(book_dir, "summaries", filename)
    if os.path.exists(summary_path):
        os.remove(summary_path)

    # Delete edits (all passes)
    edits_dir = os.path.join(book_dir, "edits")
    if os.path.exists(edits_dir):
        for pass_num in range(5):
            edit_path = os.path.join(edits_dir, f"{stem}-pass{pass_num}.md")
            if os.path.exists(edit_path):
                os.remove(edit_path)

    # Delete flags (all passes)
    flags_dir = os.path.join(book_dir, "flags")
    if os.path.exists(flags_dir):
        for pass_num in range(5):
            flag_path = os.path.join(flags_dir, f"{stem}-pass{pass_num}.json")
            if os.path.exists(flag_path):
                os.remove(flag_path)

    # Remove from manifest
    manifest = load_or_create_manifest(book_number)
    manifest["chapters"] = [ch for ch in manifest.get("chapters", []) if ch["filename"] != filename]
    save_manifest(book_number, manifest)

    return {"ok": True}


@router.get("/{book_number}/{filename}/download")
async def download_chapter(book_number: int, filename: str):
    chapter_path = os.path.join(get_book_dir(book_number), "chapters", filename)
    if not os.path.exists(chapter_path):
        raise HTTPException(status_code=404, detail="Chapter not found")
    return FileResponse(
        chapter_path,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{book_number}/{filename}/text")
async def get_chapter_text(book_number: int, filename: str):
    chapter_path = os.path.join(get_book_dir(book_number), "chapters", filename)
    if not os.path.exists(chapter_path):
        raise HTTPException(status_code=404, detail="Chapter not found")
    with open(chapter_path, "r", encoding="utf-8") as f:
        text = f.read()
    return {"filename": filename, "text": text}


class SaveBody(BaseModel):
    text: str


@router.post("/{book_number}/{filename}/save")
async def save_chapter_text(book_number: int, filename: str, body: SaveBody):
    chapter_path = os.path.join(get_book_dir(book_number), "chapters", filename)
    if not os.path.exists(chapter_path):
        raise HTTPException(status_code=404, detail="Chapter not found")
    with open(chapter_path, "w", encoding="utf-8") as f:
        f.write(body.text)
    return {"ok": True}


@router.post("/{book_number}/upload")
async def upload_chapter(book_number: int, file: UploadFile = File(...)):
    book_dir = get_book_dir(book_number)
    chapters_dir = os.path.join(book_dir, "chapters")
    os.makedirs(chapters_dir, exist_ok=True)

    filename = file.filename
    content = await file.read()
    chapter_path = os.path.join(chapters_dir, filename)
    with open(chapter_path, "wb") as f:
        f.write(content)

    # Add to manifest if not already present
    manifest = load_or_create_manifest(book_number)
    existing_filenames = {ch["filename"] for ch in manifest.get("chapters", [])}
    if filename not in existing_filenames:
        stem = os.path.splitext(filename)[0]
        display_name = stem.replace("-", " ").replace("_", " ")
        order = len(manifest.get("chapters", []))
        manifest.setdefault("chapters", []).append({
            "filename": filename,
            "display_name": display_name,
            "order": order,
        })
        save_manifest(book_number, manifest)

    return {"ok": True, "filename": filename}

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse
from processors.docx_reader import extract_text
from processors.claude_formatter import format_manuscript
from processors.epub_generator import generate_epub
from processors.pdf_generator import generate_pdf
import os

router = APIRouter()

@router.post("/format")
async def format_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    format_type: str = Form(...),
    trim_size: str = Form(default="6x9")
):
    raw_text = await extract_text(file)
    formatted_text, change_log = await format_manuscript(raw_text, format_type, trim_size)

    safe_title = title.replace(' ', '_').replace('/', '_')
    results = {"title": title, "change_log": change_log, "downloads": {}}

    if format_type in ["ebook", "both"]:
        epub_path = await generate_epub(formatted_text, title)
        results["downloads"]["epub"] = f"/download/{safe_title}.epub"

    if format_type in ["print", "both"]:
        pdf_path = await generate_pdf(formatted_text, title, trim_size)
        results["downloads"]["pdf"] = f"/download/{safe_title}.pdf"

    return results

@router.get("/download/{filename}")
async def download_file(filename: str):
    path = f"/tmp/{filename}"
    if not os.path.exists(path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    media_type = "application/epub+zip" if filename.endswith(".epub") else "application/pdf"
    return FileResponse(path, media_type=media_type, filename=filename)

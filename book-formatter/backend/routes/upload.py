from fastapi import APIRouter, UploadFile, File, Form
from processors.docx_reader import extract_text
from processors.claude_formatter import format_manuscript
from processors.epub_generator import generate_epub
from processors.pdf_generator import generate_pdf
from utils.supabase_client import upload_to_supabase

router = APIRouter()

@router.post("/format")
async def format_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    format_type: str = Form(...),  # "print", "ebook", or "both"
    trim_size: str = Form(default="6x9")
):
    raw_text = await extract_text(file)

    formatted_text, change_log = await format_manuscript(
        raw_text, format_type, trim_size
    )

    results = {"title": title, "change_log": change_log, "downloads": {}}

    if format_type in ["ebook", "both"]:
        epub_path = await generate_epub(formatted_text, title)
        epub_url = await upload_to_supabase(epub_path, f"{title}.epub")
        results["downloads"]["epub"] = epub_url

    if format_type in ["print", "both"]:
        pdf_path = await generate_pdf(formatted_text, title, trim_size)
        pdf_url = await upload_to_supabase(pdf_path, f"{title}.pdf")
        results["downloads"]["pdf"] = pdf_url

    return results

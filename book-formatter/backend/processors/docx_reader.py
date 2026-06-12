from docx import Document
import io

async def extract_text(file) -> str:
    contents = await file.read()
    doc = Document(io.BytesIO(contents))

    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            style = para.style.name
            if "Heading 1" in style:
                full_text.append(f"\n# {para.text}\n")
            elif "Heading 2" in style:
                full_text.append(f"\n## {para.text}\n")
            else:
                full_text.append(para.text)

    return "\n".join(full_text)

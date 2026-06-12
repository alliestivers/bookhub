from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
import html

TRIM_SIZES = {
    "6x9": (6 * inch, 9 * inch),
    "5x8": (5 * inch, 8 * inch),
    "5.5x8.5": (5.5 * inch, 8.5 * inch),
}

async def generate_pdf(
    formatted_text: str,
    title: str,
    trim_size: str
) -> str:

    page_size = TRIM_SIZES.get(trim_size, TRIM_SIZES["6x9"])
    safe_title = title.replace(' ', '_').replace('/', '_')
    pdf_path = f"/tmp/{safe_title}.pdf"

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=page_size,
        rightMargin=0.75 * inch,
        leftMargin=0.875 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = getSampleStyleSheet()

    body_style = ParagraphStyle(
        'BookBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=14,
        alignment=TA_JUSTIFY,
        firstLineIndent=0.3 * inch,
        spaceAfter=0,
    )

    chapter_style = ParagraphStyle(
        'ChapterHeading',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=24,
        leading=28,
        alignment=TA_CENTER,
        spaceBefore=72,
        spaceAfter=36,
    )

    story = []
    lines = formatted_text.split('\n')

    for line in lines:
        if line.startswith('# '):
            story.append(PageBreak())
            story.append(Paragraph(html.escape(line[2:]), chapter_style))
        elif line.startswith('## '):
            story.append(Paragraph(html.escape(line[3:]), chapter_style))
        elif line.strip():
            try:
                story.append(Paragraph(html.escape(line), body_style))
            except Exception:
                story.append(Paragraph(line.encode('ascii', 'replace').decode(), body_style))
        else:
            story.append(Spacer(1, 12))

    doc.build(story)
    return pdf_path

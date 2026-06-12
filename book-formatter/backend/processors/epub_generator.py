import pypandoc
import tempfile
import os

async def generate_epub(formatted_text: str, title: str) -> str:
    with tempfile.NamedTemporaryFile(
        mode='w', suffix='.md', delete=False, encoding='utf-8'
    ) as f:
        f.write(formatted_text)
        md_path = f.name

    safe_title = title.replace(' ', '_').replace('/', '_')
    epub_path = f"/tmp/{safe_title}.epub"

    pypandoc.convert_file(
        md_path,
        'epub3',
        outputfile=epub_path,
        extra_args=[
            f'--metadata=title:{title}',
        ]
    )

    os.unlink(md_path)
    return epub_path

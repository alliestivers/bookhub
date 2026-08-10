from fastapi import APIRouter, HTTPException
import os

router = APIRouter(prefix="/reference")

REFERENCE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "reference")

FILES = {
    "names": "master-names-list.md",
    "hard-rules": "hard-rules.md",
    "voice-guide": "voice-guide.md",
    "series-bible": "series-bible.md",
    "claude-md": "CLAUDE.md",
}

LABELS = {
    "names": "Master Names List",
    "hard-rules": "Hard Rules",
    "voice-guide": "Voice Guide",
    "series-bible": "Series Bible",
    "claude-md": "Editorial Instructions",
}

@router.get("")
async def list_reference_docs():
    docs = []
    for key, filename in FILES.items():
        path = os.path.join(REFERENCE_DIR, filename)
        exists = os.path.exists(path)
        docs.append({"key": key, "label": LABELS[key], "filename": filename, "exists": exists})
    return {"docs": docs}

@router.get("/{key}")
async def get_reference_doc(key: str):
    if key not in FILES:
        raise HTTPException(status_code=404, detail="Unknown reference document")
    path = os.path.join(REFERENCE_DIR, FILES[key])
    text = ""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
    return {"key": key, "label": LABELS[key], "text": text}

@router.post("/{key}")
async def save_reference_doc(key: str, body: dict):
    if key not in FILES:
        raise HTTPException(status_code=404, detail="Unknown reference document")
    os.makedirs(REFERENCE_DIR, exist_ok=True)
    path = os.path.join(REFERENCE_DIR, FILES[key])
    text = body.get("text", "")
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)

    # Auto-commit reference changes to git so they persist across restarts
    try:
        import subprocess
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
        subprocess.run(["git", "add", path], cwd=repo_root, check=True)
        subprocess.run(["git", "commit", "-m", f"Update reference doc: {FILES[key]}"], cwd=repo_root, capture_output=True)
        subprocess.run(["git", "push"], cwd=repo_root, capture_output=True)
    except Exception as e:
        print(f"Auto-commit warning: {e}")

    return {"ok": True, "key": key}

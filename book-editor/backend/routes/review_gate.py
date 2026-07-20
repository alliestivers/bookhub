from fastapi import APIRouter
import os
import json

router = APIRouter(prefix="/review-gate")

WORKSPACE = os.path.join(os.path.dirname(__file__), "..", "..", "workspace")

def _gate_path(book_number: int) -> str:
    return os.path.join(WORKSPACE, f"book-{book_number}", "logs", "review-gate.json")

def _load_gate(book_number: int) -> dict:
    path = _gate_path(book_number)
    if os.path.exists(path):
        with open(path, "r") as f:
            return json.load(f)
    return {"book_number": book_number, "status": "pending", "completed_at": None, "flags": []}

def _save_gate(book_number: int, gate: dict):
    os.makedirs(os.path.dirname(_gate_path(book_number)), exist_ok=True)
    with open(_gate_path(book_number), "w") as f:
        json.dump(gate, f, indent=2)

def _build_gate(book_number: int) -> dict:
    existing = _load_gate(book_number)
    existing_by_id = {f["id"]: f for f in existing.get("flags", [])}

    flags_dir = os.path.join(WORKSPACE, f"book-{book_number}", "flags")
    pass_labels = {0: "P0: Ingest", 1: "P1: Developmental"}
    new_flags = []

    if os.path.exists(flags_dir):
        for pass_num in [0, 1]:
            for filename in sorted(os.listdir(flags_dir)):
                if not filename.endswith(f"-pass{pass_num}.json"):
                    continue
                chapter = filename.replace(f"-pass{pass_num}.json", ".md")
                with open(os.path.join(flags_dir, filename), "r") as f:
                    flag_list = json.load(f)
                for i, flag_text in enumerate(flag_list):
                    flag_id = f"{chapter.replace('.md','')}-pass{pass_num}-{i}"
                    if flag_id in existing_by_id:
                        new_flags.append(existing_by_id[flag_id])
                    else:
                        new_flags.append({
                            "id": flag_id,
                            "chapter": chapter,
                            "pass": pass_num,
                            "pass_label": pass_labels[pass_num],
                            "text": flag_text,
                            "decision": "pending",
                            "note": ""
                        })

    gate = {
        "book_number": book_number,
        "status": existing.get("status", "pending"),
        "completed_at": existing.get("completed_at"),
        "flags": new_flags
    }
    _save_gate(book_number, gate)
    return gate

@router.get("/{book_number}")
async def get_review_gate(book_number: int):
    return _load_gate(book_number)

@router.post("/{book_number}/build")
async def build_review_gate(book_number: int):
    return _build_gate(book_number)

@router.post("/{book_number}/decision")
async def update_decision(book_number: int, body: dict):
    gate = _load_gate(book_number)
    flag_id = body.get("flag_id")
    for flag in gate["flags"]:
        if flag["id"] == flag_id:
            flag["decision"] = body.get("decision", "pending")
            flag["note"] = body.get("note", flag.get("note", ""))
            break
    _save_gate(book_number, gate)
    return gate

@router.post("/{book_number}/clear-flags")
async def clear_all_flags(book_number: int):
    flags_dir = os.path.join(WORKSPACE, f"book-{book_number}", "flags")
    cleared = 0
    if os.path.exists(flags_dir):
        for filename in os.listdir(flags_dir):
            if filename.endswith(".json"):
                os.remove(os.path.join(flags_dir, filename))
                cleared += 1
    gate_path = _gate_path(book_number)
    if os.path.exists(gate_path):
        os.remove(gate_path)
    return {"cleared": cleared, "message": f"Cleared {cleared} flag files and reset review gate."}

@router.post("/{book_number}/complete")
async def complete_gate(book_number: int, body: dict = {}):
    gate = _load_gate(book_number)
    if body.get("undo"):
        gate["status"] = "pending"
        gate["completed_at"] = None
    else:
        gate["status"] = "complete"
        from datetime import datetime
        gate["completed_at"] = datetime.utcnow().isoformat()
    _save_gate(book_number, gate)
    return gate

import anthropic
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def get_client():
    return anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def load_system_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "formatting_system_prompt.txt"
    return prompt_path.read_text()

async def format_manuscript(
    text: str,
    format_type: str,
    trim_size: str
) -> tuple[str, str]:

    client = get_client()
    system_prompt = load_system_prompt()

    user_message = f"""Format this manuscript for {format_type} publishing.
Trim size: {trim_size}
Format type: {format_type}

MANUSCRIPT:
{text}

Return your response in exactly this structure:
<formatted_manuscript>
[the fully formatted manuscript here]
</formatted_manuscript>
<change_log>
[every change made, organized by category]
</change_log>
<flags>
[anything requiring manual attention]
</flags>
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": user_message}]
    )

    full_response = response.content[0].text

    formatted = extract_between_tags(full_response, "formatted_manuscript")
    change_log = extract_between_tags(full_response, "change_log")
    flags = extract_between_tags(full_response, "flags")

    return formatted, f"{change_log}\n\nFLAGS REQUIRING MANUAL ATTENTION:\n{flags}"

def extract_between_tags(text: str, tag: str) -> str:
    start_marker = f"<{tag}>"
    end_marker = f"</{tag}>"
    start = text.find(start_marker)
    end = text.find(end_marker)
    if start == -1 or end == -1:
        return ""
    return text[start + len(start_marker):end].strip()

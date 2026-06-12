from supabase import create_client
import os

def get_supabase():
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_KEY")
    )

async def upload_to_supabase(file_path: str, filename: str) -> str:
    supabase = get_supabase()

    with open(file_path, 'rb') as f:
        data = f.read()

    supabase.storage.from_("book-formatter").upload(
        filename, data, {"upsert": "true"}
    )

    public_url = supabase.storage.from_("book-formatter").get_public_url(filename)
    return public_url

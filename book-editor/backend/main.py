from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from routes.manuscript import router as manuscript_router
from routes.passes import router as passes_router
from routes.workspace import router as workspace_router
from routes.review_gate import router as review_gate_router
from routes.chapters import router as chapters_router

load_dotenv()

app = FastAPI(title="Choose Me Editing Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(manuscript_router)
app.include_router(passes_router)
app.include_router(workspace_router)
app.include_router(review_gate_router)
app.include_router(chapters_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

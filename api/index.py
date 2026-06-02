from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import time

from api.classifier import analyze_prompt
from api.planner import execute_plan
from api.utils import logger

# Initialize FastAPI App
app = FastAPI(
    title="Grounding Layer AI Assistant API",
    description="Python Vercel Serverless Backend API for Grounding Layer AI",
    version="1.0.0"
)

# Enable CORS for frontend compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class AnalyzeRequest(BaseModel):
    prompt: str = Field(..., description="The user prompt to analyze for risk and assumptions")

class AnalyzeResponse(BaseModel):
    taskType: str
    risk: str  # "high" | "low"
    assumptions: List[str]
    missingContext: List[str]

class ContextAnswer(BaseModel):
    question: str
    answer: str

class GenerateRequest(BaseModel):
    prompt: str = Field(..., description="The user prompt to respond to")
    assumptions: Optional[List[str]] = Field(default_factory=list, description="Validated assumptions to anchor the generation")
    contextAnswers: Optional[List[ContextAnswer]] = Field(default_factory=list, description="User answered context questions")

class GenerateResponse(BaseModel):
    response: str
    isGrounded: bool

# --- Endpoints ---

@app.get("/health", tags=["Diagnostics"])
@app.get("/api/health", tags=["Diagnostics"])
def health_check():
    """Returns api health details."""
    return {
        "status": "ok",
        "timestamp": time.time(),
        "engine": "Python Serverless Vercel Engine v1"
    }

@app.post("/grounding/analyze", response_model=AnalyzeResponse, tags=["Grounding"])
@app.post("/api/grounding/analyze", response_model=AnalyzeResponse, tags=["Grounding"])
async def handle_analyze(body: AnalyzeRequest):
    """Classifies task type, evaluates risk, and extracts assumptions and missing context."""
    if not body.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'prompt' is required and must not be empty"
        )
    try:
        result = await analyze_prompt(body.prompt)
        return result
    except Exception as e:
        logger.error(f"Error during prompt analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@app.post("/grounding/generate", response_model=GenerateResponse, tags=["Grounding"])
@app.post("/api/grounding/generate", response_model=GenerateResponse, tags=["Grounding"])
async def handle_generate(body: GenerateRequest):
    """Generates a response, anchoring it to verified assumptions & context answers if provided."""
    if not body.prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Field 'prompt' is required and must not be empty"
        )
    try:
        # Convert Pydantic context answers to simple dict list
        dict_context = [{"question": c.question, "answer": c.answer} for c in body.contextAnswers] if body.contextAnswers else []
        
        response_text, is_grounded = await execute_plan(
            prompt=body.prompt,
            assumptions=body.assumptions,
            context_answers=dict_context
        )
        return GenerateResponse(response=response_text, isGrounded=is_grounded)
    except Exception as e:
        logger.error(f"Error during response generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

if __name__ == "__main__":
    import uvicorn
    logger.info("[Server] Starting local development server for Python API...")
    uvicorn.run("api.index:app", host="0.0.0.0", port=3002, reload=True)

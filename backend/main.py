from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from pydantic import BaseModel
from chain_manager import ChainManager
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
import re

app = FastAPI(title="MedSupport API")

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global chain manager
chain_manager = ChainManager()

# --- Logging Configuration ---
logger = logging.getLogger("medsupport")
logger.setLevel(logging.INFO)
c_handler = logging.StreamHandler(sys.stdout)
c_handler.setLevel(logging.INFO)
log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
c_handler.setFormatter(log_format)
logger.addHandler(c_handler)

class TextRequest(BaseModel):
    text: str

class AnalysisResponse(BaseModel):
    result: str
    annotations: list = []

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/analyze_text", response_model=AnalysisResponse)
async def analyze_text(request: TextRequest):
    logger.info(f"Received text analysis request. Length: {len(request.text)} chars")
    try:
        response = chain_manager.analyze_text(request.text)
        return {"result": response}
    except Exception as e:
        logger.error(f"Text analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simplify_report", response_model=AnalysisResponse)
async def simplify_report(request: TextRequest):
    logger.info(f"Received simplify report request. Length: {len(request.text)} chars")
    try:
        response = chain_manager.simplify_report(request.text)
        return {"result": response}
    except Exception as e:
        logger.error(f"Report simplification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze_image", response_model=AnalysisResponse)
async def analyze_image(file: UploadFile = File(...), prompt: str = Form("Describe the medical findings in this image.")):
    logger.info(f"Received image analysis request. File: {file.filename}, Prompt: {prompt}")
    try:
        contents = await file.read()
        response_text = chain_manager.analyze_image(contents, prompt)
        
        # Parse bounding boxes
        box_pattern = r"\[(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\]"
        matches = re.finditer(box_pattern, response_text)
        
        annotations = []
        for match in matches:
            y1, x1, y2, x2 = map(float, match.groups())
            annotations.append({
                "box_2d": [x1/100, y1/100, x2/100, y2/100],
                "label": "Abnormality"
            })
            
        return {"result": response_text, "annotations": annotations}
    except Exception as e:
        logger.error(f"Image analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze_note_multimodal", response_model=AnalysisResponse)
async def analyze_note_multimodal(file: UploadFile = File(...), prompt: str = Form("")):
    logger.info(f"Received multimodal scribe request. File: {file.filename}, Prompt: {prompt}")
    try:
        contents = await file.read()
        response_text = chain_manager.analyze_note_multimodal(contents, prompt)
        return {"result": response_text}
    except Exception as e:
        logger.error(f"Multimodal scribe failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simplify_report_multimodal", response_model=AnalysisResponse)
async def simplify_report_multimodal(file: UploadFile = File(...), prompt: str = Form("")):
    logger.info(f"Received multimodal report simplify request. File: {file.filename}, Prompt: {prompt}")
    try:
        contents = await file.read()
        response_text = chain_manager.simplify_report_multimodal(contents, prompt)
        return {"result": response_text}
    except Exception as e:
        logger.error(f"Multimodal report simplification failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

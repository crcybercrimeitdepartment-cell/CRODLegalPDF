from pydantic import BaseModel
from typing import List, Optional

class LensCorrectionUploadResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    detected_mode: Optional[str] = None  # "barrel", "pincushion", or None
    status_message: str = ""

class LensCorrectionApplyRequest(BaseModel):
    job_id: str
    mode: str  # "auto", "barrel", "pincushion"
    strength: int  # 0 to 100

class LensCorrectionApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str = ""

class LensCorrectionJob(BaseModel):
    job_id: str

class LensCorrectionBatchRequest(BaseModel):
    jobs: List[LensCorrectionJob]
    mode: str
    strength: int

class LensCorrectionBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class LensCorrectionBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: LensCorrectionBatchStats
    failed_jobs: List[str]

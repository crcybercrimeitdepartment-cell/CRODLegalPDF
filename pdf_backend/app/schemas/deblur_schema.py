from pydantic import BaseModel
from typing import List, Optional

class DeblurUploadResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str = ""

class DeblurApplyRequest(BaseModel):
    job_id: str
    level: str  # "low", "medium", "high"

class DeblurApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str = ""

class DeblurJob(BaseModel):
    job_id: str

class DeblurBatchRequest(BaseModel):
    jobs: List[DeblurJob]
    level: str

class DeblurBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class DeblurBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: DeblurBatchStats
    failed_jobs: List[str]

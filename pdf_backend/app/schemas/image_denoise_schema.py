from pydantic import BaseModel
from typing import List, Optional

class ImageDenoiseUploadResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str

class ImageDenoiseApplyRequest(BaseModel):
    job_id: str
    level: str  # "low", "medium", "high"

class ImageDenoiseApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str

class ImageDenoiseBatchJob(BaseModel):
    job_id: str

class ImageDenoiseBatchRequest(BaseModel):
    jobs: List[ImageDenoiseBatchJob]
    level: str

class ImageDenoiseBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class ImageDenoiseBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: ImageDenoiseBatchStats
    failed_jobs: List[str]

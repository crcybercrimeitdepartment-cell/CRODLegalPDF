from pydantic import BaseModel, Field
from typing import List, Optional

class RemoveNoiseJob(BaseModel):
    job_id: str
    level: str = Field(..., description="Noise reduction level: low, medium, high")

class RemoveNoiseApplyRequest(BaseModel):
    job_id: str
    level: str = Field(..., description="Noise reduction level: low, medium, high")

class RemoveNoiseApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status: str = "success"  # success, no_noise, failed

class RemoveNoiseBatchRequest(BaseModel):
    jobs: List[RemoveNoiseJob]

class RemoveNoiseBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class RemoveNoiseBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: RemoveNoiseBatchStats
    failed_jobs: List[str]

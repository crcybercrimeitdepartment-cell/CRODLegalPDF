from pydantic import BaseModel
from typing import List, Optional

class Point(BaseModel):
    x: float
    y: float

class PerspectiveDetectResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    corners: Optional[List[Point]] = None
    confidence: float = 0.0
    status_message: str = ""

class PerspectiveApplyRequest(BaseModel):
    job_id: str
    corners: List[Point]

class PerspectiveApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str = ""

class PerspectiveJob(BaseModel):
    job_id: str
    corners: Optional[List[Point]] = None

class PerspectiveBatchRequest(BaseModel):
    jobs: List[PerspectiveJob]

class PerspectiveBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class PerspectiveBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: PerspectiveBatchStats
    failed_jobs: List[str]

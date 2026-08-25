from pydantic import BaseModel
from typing import List, Tuple, Optional

class Point(BaseModel):
    x: float
    y: float

class DetectResponse(BaseModel):
    success: bool
    job_id: str
    original_width: int
    original_height: int
    corners: Optional[List[Point]] = None
    confidence: float
    detection_status: str
    preview_url: str

class ApplyRequest(BaseModel):
    job_id: str
    adjusted_corners: List[Point]

class ApplyResponse(BaseModel):
    success: bool
    preview_url: str
    job_id: str

class BatchJob(BaseModel):
    job_id: str
    adjusted_corners: List[Point]

class BatchApplyRequest(BaseModel):
    jobs: List[BatchJob]

class BatchApplyResponse(BaseModel):
    download_url: str

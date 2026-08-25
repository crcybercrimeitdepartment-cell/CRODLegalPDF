from pydantic import BaseModel, Field
from typing import List, Optional

class DeskewDetectResponse(BaseModel):
    success: bool
    job_id: str
    angle: float
    confidence: float
    detection_status: str  # 'detected', 'no_skew', 'low_confidence', 'detection_failed'
    original_url: str
    deskewed_preview_url: Optional[str] = None

class DeskewApplyRequest(BaseModel):
    job_id: str
    angle: float

class DeskewApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str

class DeskewJob(BaseModel):
    job_id: str
    angle: float

class DeskewBatchRequest(BaseModel):
    jobs: List[DeskewJob]

class DeskewBatchStats(BaseModel):
    total_files: int
    successful_count: int
    no_skew_count: int
    low_confidence_count: int
    failed_count: int
    failures: List[str]

class DeskewBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: DeskewBatchStats

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class DpiDetectionResponse(BaseModel):
    success: bool
    job_id: str
    width: int
    height: int
    dpi_x: Optional[float] = None
    dpi_y: Optional[float] = None
    has_dpi: bool
    format: str
    format_supported: bool
    error: Optional[str] = None

class DpiConvertRequest(BaseModel):
    job_id: str
    dpi_x: float = Field(..., gt=0, le=10000)
    dpi_y: float = Field(..., gt=0, le=10000)

class DpiConvertResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str
    verified_dpi_x: Optional[float] = None
    verified_dpi_y: Optional[float] = None

class DpiBatchJob(BaseModel):
    job_id: str
    dpi_x: float
    dpi_y: float

class DpiBatchRequest(BaseModel):
    jobs: List[DpiBatchJob]

class DpiBatchResponse(BaseModel):
    success: bool
    download_url: str
    status_message: str
    failed_jobs: List[str] = []

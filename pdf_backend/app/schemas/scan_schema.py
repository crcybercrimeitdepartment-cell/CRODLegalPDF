from pydantic import BaseModel, Field
from typing import List

class GeneratePdfRequest(BaseModel):
    job_ids: List[str] = Field(..., description="List of processed job IDs to combine into PDF")
    
class GenerateZipRequest(BaseModel):
    job_ids: List[str] = Field(..., description="List of processed job IDs to include in the ZIP")

class ScanProcessResponse(BaseModel):
    success: bool
    job_id: str
    original_filename: str
    preview_url: str
    original_url: str
    status: str
    message: str = ""

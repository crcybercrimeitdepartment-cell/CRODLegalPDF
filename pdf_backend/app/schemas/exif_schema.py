from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ExifDateTime(BaseModel):
    date_taken: Optional[str] = None
    date_original: Optional[str] = None
    date_digitized: Optional[str] = None

class ExifCameraInfo(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    lens_make: Optional[str] = None
    lens_model: Optional[str] = None
    software: Optional[str] = None

class ExifCaptureSettings(BaseModel):
    iso: Optional[str] = None
    aperture: Optional[str] = None
    shutter_speed: Optional[str] = None
    exposure_time: Optional[str] = None
    focal_length: Optional[str] = None
    flash: Optional[str] = None
    exposure_program: Optional[str] = None
    white_balance: Optional[str] = None
    metering_mode: Optional[str] = None

class ExifImageInfo(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    orientation: Optional[str] = None
    resolution: Optional[str] = None

class ExifLocation(BaseModel):
    has_gps: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None
    gps_date: Optional[str] = None

class ExifGeneral(BaseModel):
    artist: Optional[str] = None
    copyright: Optional[str] = None
    user_comment: Optional[str] = None
    description: Optional[str] = None

class ExifDataResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    format_supported: bool = True
    format: str
    date_time: ExifDateTime = Field(default_factory=ExifDateTime)
    camera_info: ExifCameraInfo = Field(default_factory=ExifCameraInfo)
    capture_settings: ExifCaptureSettings = Field(default_factory=ExifCaptureSettings)
    image_info: ExifImageInfo = Field(default_factory=ExifImageInfo)
    location: ExifLocation = Field(default_factory=ExifLocation)
    general: ExifGeneral = Field(default_factory=ExifGeneral)
    raw_exif_exists: bool = False

class ExifEditRequest(BaseModel):
    job_id: str
    action: str  # "edit", "remove_gps", "remove_all"
    
    # Editable fields
    date_taken: Optional[str] = None
    date_original: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    lens_make: Optional[str] = None
    lens_model: Optional[str] = None
    artist: Optional[str] = None
    copyright: Optional[str] = None
    description: Optional[str] = None
    user_comment: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude: Optional[float] = None

class ExifApplyResponse(BaseModel):
    success: bool
    job_id: str
    preview_url: str
    status_message: str
    verified_metadata: Optional[Dict[str, Any]] = None

class ExifBatchJob(BaseModel):
    job_id: str

class ExifBatchRequest(BaseModel):
    jobs: List[ExifBatchJob]
    action: str # "edit", "remove_gps", "remove_all"
    edit_data: Optional[Dict[str, Any]] = None

class ExifBatchStats(BaseModel):
    total: int
    successful: int
    failed: int

class ExifBatchResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    stats: ExifBatchStats
    failed_jobs: List[str]

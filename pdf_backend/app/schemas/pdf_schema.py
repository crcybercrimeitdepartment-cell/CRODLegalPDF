"""
Pydantic schemas for PDF API requests and responses.
"""

from __future__ import annotations

from typing import List, Optional, Dict, Any
import time

from pydantic import BaseModel, Field, ConfigDict


# ==========================================================
# Base Response
# ==========================================================

class APIResponse(BaseModel):
    """
    Standard API response.
    """

    model_config = ConfigDict(
        from_attributes=True
    )

    success: bool = Field(
        ...,
        description="Operation status"
    )

    message: str = Field(
        ...,
        description="Response message"
    )

    request_id: Optional[str] = Field(
        default=None,
        description="Unique request identifier"
    )


# ==========================================================
# Merge PDF
# ==========================================================

class MergePDFResponse(APIResponse):
    """
    Response after merging PDFs.
    """

    filename: str

    download_url: str

    file_size: int


# ==========================================================
# Split PDF
# ==========================================================

class SplitPDFResponse(APIResponse):
    """
    Split response.
    """

    files: List[str]

    download_url: str

    total_files: int


# ==========================================================
# Remove Pages
# ==========================================================

class RemovePagesResponse(APIResponse):
    """
    Remove pages response.
    """

    filename: str

    download_url: str

    file_size: int


# ==========================================================
# Extract Pages
# ==========================================================

class ExtractPagesResponse(APIResponse):
    """
    Extract pages response.
    """

    filename: str

    download_url: str

    file_size: int


# ==========================================================
# Compress PDF
# ==========================================================

class CompressPDFResponse(APIResponse):
    """
    Compress response.
    """

    filename: str

    download_url: str

    original_size: int

    compressed_size: int

    reduction_percent: float


# ==========================================================
# Rotate PDF
# ==========================================================

class RotatePDFResponse(APIResponse):
    """
    Rotate response.
    """

    filename: str

    download_url: str

    file_size: int


# ==========================================================
# Web Optimization Response
# ==========================================================

class WebOptimizationResponse(APIResponse):
    """
    Response for Web Optimization.
    """
    filename: str
    download_url: str
    original_size: int
    optimized_size: int
    reduction_percent: float
    processing_time: float
    total_pages: int
    optimized_images: int
    removed_metadata: bool


# ==========================================================
# Review & Annotation Schemas
# ==========================================================

class PointModel(BaseModel):
    x: float
    y: float
    pressure: Optional[float] = 1.0
    tiltX: Optional[float] = 0.0
    tiltY: Optional[float] = 0.0


class AnnotationModel(BaseModel):
    id: str
    page: int
    type: str = "pencil"  # pencil, pen, highlighter, eraser, select, shape, line, etc.
    color: str = "#000000"
    width: float = 3.0
    opacity: float = 1.0
    points: List[PointModel] = []
    arrowStyle: Optional[str] = "solid"
    headSize: Optional[str] = "medium"
    stampText: Optional[str] = "APPROVED"
    stampCategory: Optional[str] = "approved"
    stampStyle: Optional[str] = "boxed"
    text: Optional[str] = ""
    calloutStyle: Optional[str] = "boxed"
    leaderStyle: Optional[str] = "arrow"
    inkStyle: Optional[str] = "fountain"
    pressureSensitivity: Optional[bool] = True
    highlightColor: Optional[str] = "#FACC15"
    underlineStyle: Optional[str] = "solid"
    strikeStyle: Optional[str] = "solid"
    waveAmplitude: Optional[float] = 2.5
    waveLength: Optional[float] = 6.0
    stickyColor: Optional[str] = "#FEF08A"
    noteTitle: Optional[str] = "Sticky Note"
    isExpanded: Optional[bool] = True
    fontSize: Optional[float] = 14.0
    fontColor: Optional[str] = "#000000"
    backgroundColor: Optional[str] = "#FFFFFF"
    borderColor: Optional[str] = "#2563EB"
    boxWidth: Optional[float] = 160.0
    boxHeight: Optional[float] = 60.0
    fontFamily: Optional[str] = "helv"
    fontWeight: Optional[str] = "normal"
    rectStyle: Optional[str] = "solid"
    lineStyle: Optional[str] = "solid"
    fillColor: Optional[str] = "transparent"
    fillOpacity: Optional[float] = 0.2
    cloudAmplitude: Optional[float] = 8.0
    measureType: Optional[str] = "distance"
    measureUnit: Optional[str] = "cm"
    measureScale: Optional[float] = 1.0
    measureValue: Optional[str] = ""
    rotation: Optional[float] = 0.0
    scale: Optional[float] = 1.0
    locked: Optional[bool] = False
    author: Optional[str] = "User"
    created_at: Optional[float] = Field(default_factory=time.time)
    updated_at: Optional[float] = Field(default_factory=time.time)
    pointer_type: Optional[str] = "mouse"  # mouse, pen, touch
    comment: Optional[str] = ""
    status: Optional[str] = "Open"  # Open, In Review, Approved, Resolved, Rejected
    replies: Optional[List[Dict[str, Any]]] = []


class DocumentAnnotationsPayload(BaseModel):
    document_id: str
    annotations: List[AnnotationModel] = []


class UploadResponse(BaseModel):
    success: bool
    document_id: str
    filename: str
    page_count: int
    pages: List[Dict[str, float]]  # width and height of each page in points


class SavePdfRequest(BaseModel):
    annotations: Optional[List[AnnotationModel]] = None


class SavePdfResponse(BaseModel):
    success: bool
    document_id: str
    output_file: str
    download_url: str
    message: str = "PDF saved successfully"


class ReplyPayload(BaseModel):
    author: Optional[str] = "Collaborator"
    text: str = Field(..., description="Reply comment message text")
    status: Optional[str] = None  # Optional status update (e.g. Approved, Resolved)
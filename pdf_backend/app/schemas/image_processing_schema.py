from pydantic import BaseModel, Field
from typing import Optional

class CropState(BaseModel):
    left: int = Field(ge=0, description="Left coordinate in pixels")
    top: int = Field(ge=0, description="Top coordinate in pixels")
    right: int = Field(gt=0, description="Right coordinate in pixels")
    bottom: int = Field(gt=0, description="Bottom coordinate in pixels")

class ResizeState(BaseModel):
    width: int = Field(gt=0, le=8000, description="Target width in pixels")
    height: int = Field(gt=0, le=8000, description="Target height in pixels")
    keep_aspect_ratio: bool = Field(default=True, description="Maintain aspect ratio flag")

class TextOverlayState(BaseModel):
    text: str = Field(min_length=1, max_length=500, description="Text string to overlay")
    font_size: int = Field(default=24, ge=8, le=250, description="Font size in pixels")
    color: str = Field(default="#ffffff", description="Hex color code (e.g. #ffffff)")
    is_bold: bool = Field(default=False, description="Bold style flag")
    is_italic: bool = Field(default=False, description="Italic style flag")
    x: int = Field(default=10, ge=0, description="X offset on image canvas")
    y: int = Field(default=10, ge=0, description="Y offset on image canvas")

class ImageEditorRequestState(BaseModel):
    crop: Optional[CropState] = None
    resize: Optional[ResizeState] = None
    rotation: int = Field(default=0, description="Rotation angle in degrees (0, 90, 180, 270)")
    flip_horizontal: bool = Field(default=False, description="Horizontal mirror flag")
    flip_vertical: bool = Field(default=False, description="Vertical flip flag")
    brightness: float = Field(default=1.0, ge=0.0, le=3.0, description="Brightness factor (1.0 = normal)")
    contrast: float = Field(default=1.0, ge=0.0, le=3.0, description="Contrast factor (1.0 = normal)")
    saturation: float = Field(default=1.0, ge=0.0, le=3.0, description="Saturation factor (1.0 = normal)")
    sharpness: float = Field(default=1.0, ge=0.0, le=5.0, description="Sharpness factor (1.0 = normal)")
    filter: str = Field(default="original", description="Filter preset: original, grayscale, sepia, black_white")
    text: Optional[TextOverlayState] = None

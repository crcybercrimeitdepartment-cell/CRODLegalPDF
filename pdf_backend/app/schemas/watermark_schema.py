from pydantic import BaseModel, Field, validator
from typing import Optional, Literal

class WatermarkSettings(BaseModel):
    watermark_type: Literal["text", "image"] = Field(..., description="Type of watermark: 'text' or 'image'")
    text: Optional[str] = Field(None, description="Text content if type is text")
    color: Optional[str] = Field("#ffffff", description="Hex color for text watermark")
    font_family: Optional[str] = Field("Roboto-Regular", description="Font family for text")
    
    position_mode: Literal["grid", "custom"] = Field("grid", description="Position mode")
    grid_position: Optional[str] = Field("bottom-right", description="Position in grid mode (e.g., top-left, center, bottom-right)")
    custom_x_pct: Optional[float] = Field(None, description="Custom X position percentage (0-100) if mode is custom")
    custom_y_pct: Optional[float] = Field(None, description="Custom Y position percentage (0-100) if mode is custom")
    
    size: float = Field(20.0, description="Scale factor relative to main image size (percentage, e.g., 20.0)")
    opacity: int = Field(50, ge=0, le=100, description="Opacity percentage (0-100)")
    rotation: int = Field(0, ge=-180, le=180, description="Rotation angle in degrees")
    
    @validator("text", always=True)
    def validate_text(cls, v, values):
        if values.get("watermark_type") == "text" and not v:
            raise ValueError("Text content is required for text watermarks")
        return v

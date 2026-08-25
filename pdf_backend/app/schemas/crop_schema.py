from pydantic import BaseModel, Field
from typing import Optional

class CropRequestState(BaseModel):
    """
    Pydantic schema representing crop area box coordinates.
    left, top, right, bottom are in pixels relative to original image dimensions.
    """
    left: int = Field(default=0, ge=0, description="Left coordinate in pixels")
    top: int = Field(default=0, ge=0, description="Top coordinate in pixels")
    right: int = Field(default=100, gt=0, description="Right coordinate in pixels")
    bottom: int = Field(default=100, gt=0, description="Bottom coordinate in pixels")
    aspect_ratio: Optional[str] = Field(default="free", description="Aspect ratio preset: 'free', '1:1', '4:3', '16:9', '9:16', '3:2', '2:3'")

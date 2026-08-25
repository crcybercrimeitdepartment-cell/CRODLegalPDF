from pydantic import BaseModel, Field

class ConvertRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for image format conversion.
    target_format: 'jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'.
    quality: Quality setting 1-100 (for JPG/WEBP). Default 90.
    preserve_alpha: True to preserve alpha transparency in supported target formats.
    """
    target_format: str = Field(default="png", description="Target image format")
    quality: int = Field(default=90, ge=1, le=100, description="Encoding quality (1-100)")
    preserve_alpha: bool = Field(default=True, description="Preserve alpha transparency")

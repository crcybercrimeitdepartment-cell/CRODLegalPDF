from pydantic import BaseModel, Field

class UpscaleRequestState(BaseModel):
    """
    Pydantic schema representing state parameter for the image upscaling process.
    Supports upscale factor of 2, 3, or 4.
    """
    scale_factor: int = Field(default=2, ge=2, le=4, description="Upscale multiplier (2, 3, or 4)")

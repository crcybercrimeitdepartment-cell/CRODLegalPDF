from pydantic import BaseModel, Field

class SaturationRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for image saturation adjustment.
    saturation: -100.0 (grayscale/muted) to +100.0 (vivid/vibrant). Default 0.0 (normal 1.0 factor).
    """
    saturation: float = Field(default=0.0, ge=-100.0, le=100.0, description="Saturation level (-100% to +100%)")

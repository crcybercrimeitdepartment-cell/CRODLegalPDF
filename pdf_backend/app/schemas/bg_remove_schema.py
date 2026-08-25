from pydantic import BaseModel, Field

class BgRemoveRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for AI background removal & refinement.
    feather: Edge feathering blur radius in pixels (0.0 to 20.0). Default 0.0.
    threshold: Alpha mask threshold cutoff percentage (0 to 100). Default 50.
    """
    feather: float = Field(default=0.0, ge=0.0, le=20.0, description="Edge feathering blur radius (0-20px)")
    threshold: int = Field(default=50, ge=0, le=100, description="Mask threshold cutoff (0-100%)")

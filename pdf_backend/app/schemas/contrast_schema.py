from pydantic import BaseModel, Field

class ContrastRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for image contrast adjustment.
    mode: 'manual' (slider adjustment) or 'auto' (automatic histogram equalization).
    contrast: -100.0 (low contrast) to +100.0 (high contrast). Default 0.0 (normal 1.0 factor).
    """
    mode: str = Field(default="manual", description="Contrast adjustment mode: 'manual' or 'auto'")
    contrast: float = Field(default=0.0, ge=-100.0, le=100.0, description="Manual contrast level (-100% to +100%)")

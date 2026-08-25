from pydantic import BaseModel, Field

class BrightnessRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for image brightness adjustment.
    brightness: -100.0 (completely dark / 0.0 factor) to +100.0 (double bright / 2.0 factor). Default 0.0 (normal 1.0 factor).
    """
    brightness: float = Field(default=0.0, ge=-100.0, le=100.0, description="Brightness adjustment level (-100% to +100%)")

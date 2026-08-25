from pydantic import BaseModel, Field

class SharpenRequestState(BaseModel):
    intensity: float = Field(default=50.0, ge=0.0, le=100.0, description="Sharpening intensity percentage (0 to 100)")

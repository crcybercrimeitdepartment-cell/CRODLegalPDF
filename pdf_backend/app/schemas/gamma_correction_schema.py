from pydantic import BaseModel, Field

class GammaCorrectionRequestState(BaseModel):
    gamma: float = Field(default=1.0, ge=0.1, le=3.0, description="Gamma correction factor: 0.1 (Much Brighter) to 3.0 (Much Darker), 1.0 (Neutral)")

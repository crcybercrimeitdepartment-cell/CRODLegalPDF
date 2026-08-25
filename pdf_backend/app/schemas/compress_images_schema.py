from typing import Literal
from pydantic import BaseModel, Field

class CompressImagesRequestState(BaseModel):
    level: Literal["low", "balanced", "high"] = Field(
        default="balanced", 
        description="Compression level: 'low' (best quality), 'balanced' (recommended default), 'high' (smallest size)"
    )

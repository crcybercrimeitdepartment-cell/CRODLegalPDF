from pydantic import BaseModel, Field

class RotateRequestState(BaseModel):
    angle: int = Field(default=0, ge=-360, le=360, description="Rotation angle in degrees (e.g. 90, 180, 270, -90)")
    expand: bool = Field(default=True, description="Maintain full image bounds by expanding canvas box")

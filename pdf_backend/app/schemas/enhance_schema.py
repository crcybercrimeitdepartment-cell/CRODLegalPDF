from pydantic import BaseModel, Field

class EnhanceRequestState(BaseModel):
    enhancement_level: str = Field(default="medium", description="Enhancement level: low, medium, high, ultra")
    auto_color_balance: bool = Field(default=True, description="Automatic color balance calibration")
    denoise: bool = Field(default=True, description="Apply noise reduction smoothing")

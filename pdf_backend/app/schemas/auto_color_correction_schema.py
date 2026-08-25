from pydantic import BaseModel, Field

class AutoColorCorrectionRequestState(BaseModel):
    preserve_alpha: bool = Field(default=True, description="Preserve PNG/WebP alpha channel transparency")

class ColorAnalysisMetrics(BaseModel):
    color_cast_detected: str = Field(default="None (Balanced)", description="Type of detected color cast")
    white_balance_status: str = Field(default="Calibrated", description="White balance calibration status")
    brightness_level: str = Field(default="Optimal", description="Analyzed brightness level")
    contrast_range: str = Field(default="Normalized", description="Dynamic contrast distribution range")

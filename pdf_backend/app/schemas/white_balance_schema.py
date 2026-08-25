from pydantic import BaseModel, Field

class WhiteBalanceRequestState(BaseModel):
    mode: str = Field(default="manual", description="White balance mode: 'manual' or 'auto'")
    temperature: int = Field(default=0, ge=-100, le=100, description="Temperature shift: -100 (Cool Blue) to +100 (Warm Amber)")
    tint: int = Field(default=0, ge=-100, le=100, description="Tint shift: -100 (Green) to +100 (Magenta)")

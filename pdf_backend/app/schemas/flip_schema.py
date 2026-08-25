from pydantic import BaseModel, Field

class FlipRequestState(BaseModel):
    flip_horizontal: bool = Field(default=False, description="Horizontal mirror flag")
    flip_vertical: bool = Field(default=False, description="Vertical flip flag")

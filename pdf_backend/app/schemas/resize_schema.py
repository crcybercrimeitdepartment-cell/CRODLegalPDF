from pydantic import BaseModel, Field

class ResizeRequestState(BaseModel):
    """
    Pydantic schema representing independent target width and height in pixels for image resizing.
    Width & Height must be between 1 and 10,000 pixels.
    """
    width: int = Field(..., ge=1, le=10000, description="Target width in pixels (1 to 10,000)")
    height: int = Field(..., ge=1, le=10000, description="Target height in pixels (1 to 10,000)")

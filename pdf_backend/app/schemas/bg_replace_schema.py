from pydantic import BaseModel, Field
from typing import Optional

class BgReplaceRequestState(BaseModel):
    """
    Pydantic schema representing state configuration for background replacement.
    bg_type: 'color' | 'gradient' | 'image' | 'custom'
    color_hex: Hex color string (e.g. '#ffffff')
    gradient_name: 'sunset' | 'ocean' | 'neon' | 'emerald'
    pattern_name: 'grid' | 'dots' | 'mesh'
    bg_image_preset: Optional preset background image identifier
    """
    bg_type: str = Field(default="color", description="Background type: 'color', 'gradient', 'image', 'custom'")
    color_hex: str = Field(default="#ffffff", description="Hex color for solid background")
    gradient_name: str = Field(default="sunset", description="Gradient preset name")
    pattern_name: str = Field(default="grid", description="Custom design pattern preset")
    bg_image_preset: Optional[str] = Field(default=None, description="Preset background image")

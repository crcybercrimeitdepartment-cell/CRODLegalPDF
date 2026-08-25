from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

SUPPORTED_DPI_FORMATS = ['JPEG', 'PNG', 'WEBP', 'TIFF']

def detect_dpi(image_bytes: bytes, job_id: str) -> dict:
    """
    Reads an image and detects its pixel dimensions and DPI metadata safely.
    Returns a dictionary suitable for DpiDetectionResponse.
    """
    try:
        img_buffer = io.BytesIO(image_bytes)
        img = Image.open(img_buffer)
        
        format_name = img.format or "UNKNOWN"
        format_supported = format_name in SUPPORTED_DPI_FORMATS
        
        width, height = img.size
        
        # Extract DPI
        dpi = img.info.get('dpi')
        
        dpi_x = None
        dpi_y = None
        has_dpi = False
        
        if dpi and isinstance(dpi, tuple) and len(dpi) >= 2:
            try:
                dpi_x = float(dpi[0])
                dpi_y = float(dpi[1])
                has_dpi = True
            except ValueError:
                has_dpi = False
                
        return {
            "success": True,
            "job_id": job_id,
            "width": width,
            "height": height,
            "dpi_x": dpi_x,
            "dpi_y": dpi_y,
            "has_dpi": has_dpi,
            "format": format_name,
            "format_supported": format_supported,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"DPI Detection failed: {e}")
        return {
            "success": False,
            "job_id": job_id,
            "width": 0,
            "height": 0,
            "dpi_x": None,
            "dpi_y": None,
            "has_dpi": False,
            "format": "UNKNOWN",
            "format_supported": False,
            "error": "Failed to read image data."
        }

def convert_dpi(image_bytes: bytes, dpi_x: float, dpi_y: float) -> bytes:
    """
    Modifies the DPI metadata of the image without resizing or altering pixels.
    Safely preserves EXIF, ICC profiles, and transparency where applicable.
    """
    img_buffer = io.BytesIO(image_bytes)
    img = Image.open(img_buffer)
    
    format_name = img.format
    if format_name not in SUPPORTED_DPI_FORMATS:
        raise ValueError(f"DPI metadata modification is not reliably supported for {format_name}.")
        
    out_buffer = io.BytesIO()
    
    # Get original info to preserve EXIF, ICC Profile, etc.
    save_kwargs = img.info.copy()
    
    # Remove old dpi if present
    save_kwargs.pop('dpi', None)
    
    # Format-specific kwargs
    if format_name == 'JPEG':
        save_kwargs['quality'] = 'keep'
        save_kwargs['subsampling'] = 'keep'
    elif format_name == 'PNG':
        pass
    elif format_name == 'WEBP':
        save_kwargs['lossless'] = True # Try to avoid quality loss, though WebP DPI is tricky
        
    # Pillow handles DPI embedding when saving using the `dpi` kwarg
    img.save(out_buffer, format=format_name, dpi=(dpi_x, dpi_y), **save_kwargs)
    
    return out_buffer.getvalue()

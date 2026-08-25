from typing import Any, Dict, Optional
from fastapi.responses import JSONResponse

def success_response(message: str = "Request successful", data: Optional[Dict[str, Any]] = None, status_code: int = 200) -> JSONResponse:
    """
    Standardized success response.
    """
    content = {
        "success": True,
        "message": message,
        "data": data or {}
    }
    return JSONResponse(status_code=status_code, content=content)

def error_response(message: str = "Something went wrong", error_code: str = "ERROR", status_code: int = 400) -> JSONResponse:
    """
    Standardized error response.
    """
    content = {
        "success": False,
        "message": message,
        "error_code": error_code
    }
    return JSONResponse(status_code=status_code, content=content)

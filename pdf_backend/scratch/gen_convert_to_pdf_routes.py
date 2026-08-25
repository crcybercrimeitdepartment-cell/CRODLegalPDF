import os

services_dir = "c:/Users/achar/Desktop/Legal_pdf_fullstack/pdf_backend/app/Convert_to_pdf_services"
output_file = "c:/Users/achar/Desktop/Legal_pdf_fullstack/pdf_backend/app/api/convert_to_pdf_routes.py"

files = [f for f in os.listdir(services_dir) if f.endswith("_service.py") and f != "Pdf_to_pdfa_service.py"]

# Add Pdf_to_pdfa manually if needed, but it's PDF to PDF/A so it might be in another category. Actually, it's Convert_to_pdf_services

imports = []
routes = []

for f in files:
    if f == "Pdf_to_pdfa_service.py":
        continue
    
    module_name = f.replace(".py", "")
    # e.g. bmp_to_pdf_service -> bmp
    prefix = module_name.split("_to_pdf")[0]
    
    # instance name is usually exactly module_name
    instance_name = module_name
    
    imports.append(f"from app.Convert_to_pdf_services.{module_name} import {instance_name}")
    
    routes.append(f"""
@router.post("/convert-to-pdf/{prefix}-to-pdf/upload")
async def {prefix}_to_pdf_upload(request: Request, file: UploadFile = File(...)):
    request_id = request.state.request_id
    if not file.filename: raise HTTPException(status_code=400, detail="No filename provided.")
    upload_dir = Paths.request_upload(request_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / file.filename
    await save_upload(file.file, file_path)
    return {{"success": True, "request_id": request_id, "filename": file.filename}}

@router.post("/convert-to-pdf/{prefix}-to-pdf/process")
async def {prefix}_to_pdf_process(request_id: str = Form(...), filename: str = Form(...)):
    try:
        result = await {instance_name}.process(request_id=request_id, filenames=[filename], config={{}})
        pdf_filename = result.get("pdf_filename", "converted.pdf")
        if not pdf_filename and "output_file" in result:
             pdf_filename = os.path.basename(result["output_file"])
        return {{
            "success": True,
            "download_url": f"/api/convert-to-pdf/download/{{request_id}}/{{pdf_filename}}"
        }}
    except Exception as e:
        logger.error(f"Error: {{e}}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
""")

# Special route for downloading
download_route = """
@router.get("/convert-to-pdf/download/{request_id}/{filename}")
async def download_converted_pdf(request_id: str, filename: str):
    if "\\" in request_id or "/" in request_id or "\\" in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid path")
    output_dir = Paths.request_output(request_id)
    file_path = output_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=str(file_path), filename=filename, media_type="application/pdf")
"""

content = f"""from fastapi import APIRouter, Request, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse
import logging
from pathlib import Path
import os

from app.core.paths import Paths
from app.utils.file_handler import save_upload

{chr(10).join(imports)}

logger = logging.getLogger(__name__)
router = APIRouter()

{download_route}

{chr(10).join(routes)}
"""

with open(output_file, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Generated {output_file}")

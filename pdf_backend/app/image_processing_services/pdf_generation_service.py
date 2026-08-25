import fitz  # PyMuPDF
from typing import List
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def generate_multipage_pdf(image_paths: List[Path], output_pdf_path: Path) -> Path:
    """
    Combines a list of image file paths into a single PyMuPDF document.
    Ensures correct page order, dimensions, and good image quality.
    """
    doc = fitz.open()
    
    for img_path in image_paths:
        try:
            # Open the image using fitz
            img_doc = fitz.open(str(img_path))
            # Convert the image to a PDF page
            pdf_bytes = img_doc.convert_to_pdf()
            # Open the PDF bytes
            temp_pdf = fitz.open("pdf", pdf_bytes)
            # Insert the page into the main document
            doc.insert_pdf(temp_pdf)
            # Close temporary documents
            img_doc.close()
            temp_pdf.close()
        except Exception as e:
            logger.error(f"Failed to add {img_path} to PDF: {e}")
            raise RuntimeError(f"Failed to process image into PDF: {e}")
            
    try:
        # Save the final document
        doc.save(str(output_pdf_path), garbage=4, deflate=True)
    except Exception as e:
        logger.error(f"Failed to save PDF {output_pdf_path}: {e}")
        raise RuntimeError("Failed to save the generated PDF.")
    finally:
        doc.close()
        
    return output_pdf_path

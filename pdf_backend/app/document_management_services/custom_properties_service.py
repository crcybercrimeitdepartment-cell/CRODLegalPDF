"""
Custom Properties Service — Document Management Section.

Allows users to attach business-specific metadata to PDF documents:
  - Create, read, update, delete custom properties
  - Property types: Text, Number, Date, Boolean
  - Persists properties via XMP metadata in the PDF
  - Original PDF remains unchanged — generates new PDF with updated properties
  - Validates property names and values
  - Prevents duplicate property names (case-insensitive)
"""

from __future__ import annotations

import io
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

from app.core.paths import Paths

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024
MAX_PROPERTY_NAME_LENGTH = 100
MAX_PROPERTY_VALUE_LENGTH = 1000
CUSTOM_NAMESPACE = "http://example.com/custom/"
CUSTOM_PREFIX = "custom"

SUPPORTED_PROPERTY_TYPES = ["Text", "Number", "Date", "Boolean"]


class CustomPropertiesService:
    """Enterprise service for managing custom properties on PDF documents."""

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent path traversal and unsafe characters."""
        if not filename:
            return "document.pdf"
        clean = Path(filename).name
        clean = re.sub(r'[\\/:*?"<>|]', "_", clean)
        clean = re.sub(r"\s+", " ", clean).strip(" ._")
        return clean or "document.pdf"

    def validate_pdf(self, pdf_bytes: bytes) -> fitz.Document:
        """Validate PDF bytes and return opened fitz.Document."""
        if not pdf_bytes or len(pdf_bytes) == 0:
            raise ValueError("Uploaded file is empty.")
        if len(pdf_bytes) > MAX_FILE_SIZE_BYTES:
            size_mb = len(pdf_bytes) / (1024 * 1024)
            raise ValueError(f"File size ({size_mb:.1f} MB) exceeds maximum limit of 100 MB.")
        if not pdf_bytes.startswith(b"%PDF"):
            raise ValueError("Invalid PDF document (missing %PDF header).")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            logger.warning(f"Failed to open PDF: {e}")
            raise ValueError("Corrupted or unreadable PDF document.")

        if doc.is_encrypted:
            doc.close()
            raise ValueError("PDF document is encrypted or password-protected. Please decrypt it first.")

        if doc.page_count == 0:
            doc.close()
            raise ValueError("PDF document contains 0 pages.")

        return doc

    def validate_property_name(self, name: str) -> Tuple[bool, str]:
        """Validate a custom property name."""
        if not name or not name.strip():
            return False, "Property name cannot be empty."

        name = name.strip()

        if len(name) > MAX_PROPERTY_NAME_LENGTH:
            return False, f"Property name exceeds maximum length of {MAX_PROPERTY_NAME_LENGTH} characters."

        if not re.match(r'^[a-zA-Z0-9_\-\s]+$', name):
            return False, "Property name can only contain letters, numbers, spaces, hyphens, and underscores."

        if re.match(r'^[\d\s\-_]+$', name):
            return False, "Property name cannot be only numbers, spaces, or special characters."

        return True, ""

    def validate_property_value(self, value: str, prop_type: str) -> Tuple[bool, str]:
        """Validate a custom property value based on its type."""
        if not value or not value.strip():
            return False, "Property value cannot be empty."

        value = value.strip()

        if len(value) > MAX_PROPERTY_VALUE_LENGTH:
            return False, f"Property value exceeds maximum length of {MAX_PROPERTY_VALUE_LENGTH} characters."

        if prop_type == "Number":
            try:
                float(value)
            except ValueError:
                return False, f"Value '{value}' is not a valid number."

        elif prop_type == "Date":
            date_pattern = r'^\d{4}-\d{2}-\d{2}$'
            if not re.match(date_pattern, value):
                return False, "Date must be in YYYY-MM-DD format (e.g., 2026-08-14)."
            try:
                year, month, day = value.split("-")
                year, month, day = int(year), int(month), int(day)
                if not (1 <= month <= 12):
                    return False, "Invalid month in date."
                if not (1 <= day <= 31):
                    return False, "Invalid day in date."
            except ValueError:
                return False, "Invalid date format."

        elif prop_type == "Boolean":
            if value.lower() not in ("true", "false", "yes", "no", "1", "0"):
                return False, "Boolean value must be: true, false, yes, no, 1, or 0."

        return True, ""

    def read_custom_properties(self, pdf_bytes: bytes) -> List[Dict[str, str]]:
        """Extract custom properties from PDF XMP metadata."""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception:
            return []

        try:
            xmp_xml = doc.get_xml_metadata()
            if not xmp_xml:
                return []

            # Try new format first (RDF bag with original names)
            properties = self._read_rbag_format(xmp_xml)
            if properties:
                return properties

            # Fallback to legacy format (simple custom:name elements)
            return self._read_legacy_format(xmp_xml)

        except Exception as e:
            logger.warning(f"Error reading custom properties: {e}")
            return []
        finally:
            doc.close()

    def _read_rbag_format(self, xmp_xml: str) -> List[Dict[str, str]]:
        """Read properties from RDF bag format."""
        properties = []
        
        # Find all rdf:Bag blocks within custom:custom_properties
        bag_pattern = r"<rdf:Bag>\s*<rdf:li><custom:prop_name>([^<]*)</custom:prop_name></rdf:li>\s*<rdf:li><custom:prop_type>([^<]*)</custom:prop_type></rdf:li>\s*<rdf:li><custom:prop_value>([^<]*)</custom:prop_value></rdf:li>\s*</rdf:Bag>"
        
        matches = re.findall(bag_pattern, xmp_xml)
        
        for name, prop_type, value in matches:
            # Unescape XML entities
            name = name.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            value = value.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            prop_type = prop_type.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
            
            properties.append({
                "name": name,
                "value": value,
                "type": prop_type,
            })
        
        return properties

    def _read_legacy_format(self, xmp_xml: str) -> List[Dict[str, str]]:
        """Read properties from legacy custom:name format."""
        custom_pattern = r"<custom:([a-zA-Z0-9_\-]+)>([^<]*)</custom:([a-zA-Z0-9_\-]+)>"
        matches = re.findall(custom_pattern, xmp_xml)

        properties = []
        seen_names = set()
        for name, value, _ in matches:
            # Skip the custom_properties wrapper element
            if name in ("custom_properties", "prop_name", "prop_type", "prop_value"):
                continue
                
            name_lower = name.lower()
            if name_lower not in seen_names:
                seen_names.add(name_lower)
                # Convert underscores back to spaces for display
                display_name = name.replace("_", " ")
                properties.append({
                    "name": display_name,
                    "value": value,
                    "type": self._infer_property_type(value),
                })

        return properties

    def _infer_property_type(self, value: str) -> str:
        """Infer the property type from its value."""
        if not value:
            return "Text"

        if value.lower() in ("true", "false", "yes", "no", "1", "0"):
            return "Boolean"

        try:
            float(value)
            return "Number"
        except ValueError:
            pass

        date_pattern = r'^\d{4}-\d{2}-\d{2}$'
        if re.match(date_pattern, value):
            try:
                year, month, day = value.split("-")
                year, month, day = int(year), int(month), int(day)
                if 1 <= month <= 12 and 1 <= day <= 31:
                    return "Date"
            except ValueError:
                pass

        return "Text"

    def analyze_pdf(self, pdf_bytes: bytes, original_filename: str) -> Dict[str, Any]:
        """Analyze PDF and return file info plus existing custom properties."""
        doc = self.validate_pdf(pdf_bytes)

        try:
            file_info = {
                "filename": original_filename or "document.pdf",
                "file_size": len(pdf_bytes),
                "file_size_human": self._format_file_size(len(pdf_bytes)),
                "mime_type": "application/pdf",
                "page_count": doc.page_count,
            }

            existing_properties = self.read_custom_properties(pdf_bytes)

            return {
                "success": True,
                "file_info": file_info,
                "existing_properties": existing_properties,
                "property_count": len(existing_properties),
                "supported_types": SUPPORTED_PROPERTY_TYPES,
            }

        finally:
            doc.close()

    def _format_file_size(self, size_bytes: int) -> str:
        """Format file size to human-readable string."""
        if size_bytes == 0:
            return "0 B"
        k = 1024
        sizes = ["B", "KB", "MB", "GB"]
        i = min(int(__import__("math").log(size_bytes) / __import__("math").log(k)), len(sizes) - 1)
        return f"{size_bytes / k**i:.1f} {sizes[i]}"

    def _build_xmp_metadata(self, properties: List[Dict[str, str]], existing_xmp: str = "") -> str:
        """Build XMP metadata XML string with custom properties.
        
        Uses RDF bag to store properties with original names preserved.
        Each property is stored as an RDF bag item with:
        - name: original property name
        - type: property type (Text, Number, Date, Boolean)
        - value: property value
        """
        property_bags = []
        for prop in properties:
            name = prop["name"]
            value = prop["value"]
            prop_type = prop.get("type", "Text")
            
            escaped_name = name.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            escaped_value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            escaped_type = prop_type.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            
            property_bags.append(f"""    <rdf:Bag>
      <rdf:li><custom:prop_name>{escaped_name}</custom:prop_name></rdf:li>
      <rdf:li><custom:prop_type>{escaped_type}</custom:prop_type></rdf:li>
      <rdf:li><custom:prop_value>{escaped_value}</custom:prop_value></rdf:li>
    </rdf:Bag>""")

        properties_xml = "\n".join(property_bags)

        xmp_xml = f"""<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about=""
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:custom="{CUSTOM_NAMESPACE}">
  <custom:custom_properties>
{properties_xml}
  </custom:custom_properties>
</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w\"?>"""

        return xmp_xml

    def save_custom_properties(
        self,
        session_id: str,
        pdf_bytes: bytes,
        original_filename: str,
        properties: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Save custom properties to a new PDF file."""
        doc = self.validate_pdf(pdf_bytes)

        try:
            existing_xmp = doc.get_xml_metadata() or ""
            new_xmp = self._build_xmp_metadata(properties, existing_xmp)
            doc.set_xml_metadata(new_xmp)

            out_dir = Paths.request_output(session_id)
            out_dir.mkdir(parents=True, exist_ok=True)

            clean_filename = self.sanitize_filename(original_filename)
            out_filename = f"custom_props_{clean_filename}"
            out_path = out_dir / out_filename

            output_bytes = doc.write()
            doc.close()

            out_path.write_bytes(output_bytes)

            return {
                "success": True,
                "session_id": session_id,
                "original_filename": clean_filename,
                "saved_filename": out_filename,
                "properties_count": len(properties),
                "properties": properties,
                "download_url": f"/document-management/custom-properties/download/{session_id}",
            }

        except Exception as e:
            if doc:
                doc.close()
            raise

    def get_file_for_download(self, session_id: str) -> Tuple[Path, str]:
        """Retrieve output PDF for download."""
        out_dir = Paths.request_output(session_id)
        files = [f for f in out_dir.glob("*.pdf") if f.is_file()] if out_dir.exists() else []
        if not files:
            raise ValueError("Output PDF file not found for this session.")
        return files[0], files[0].name


custom_properties_service = CustomPropertiesService()

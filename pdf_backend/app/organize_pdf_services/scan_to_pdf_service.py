from __future__ import annotations

import io
import logging
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import img2pdf
import numpy as np
from PIL import Image

from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}
MAX_IMAGE_SIZE = 50 * 1024 * 1024


class ScanToPDFService:

    def __init__(self) -> None:
        self._sessions: Dict[str, Dict[str, Any]] = {}

    def create_session(self, request_id: str) -> Dict[str, Any]:
        session = {
            "request_id": request_id,
            "pages": [],
            "output_filename": None,
            "processing": False,
        }
        self._sessions[request_id] = session
        Paths.request_temp(request_id).mkdir(parents=True, exist_ok=True)
        Paths.request_upload(request_id).mkdir(parents=True, exist_ok=True)
        Paths.request_output(request_id).mkdir(parents=True, exist_ok=True)
        return {"success": True, "request_id": request_id}

    def _get_session(self, request_id: str) -> Dict[str, Any]:
        if request_id not in self._sessions:
            raise ValueError(f"Session not found: {request_id}")
        return self._sessions[request_id]

    def cleanup(self, request_id: str) -> None:
        self._sessions.pop(request_id, None)

    def upload_images(
        self,
        file_paths: List[Path],
        filenames: List[str],
        request_id: str,
    ) -> Dict[str, Any]:
        session = self._get_session(request_id)
        pages = []
        for fp, fn in zip(file_paths, filenames):
            ext = Path(fn).suffix.lower()
            if ext not in SUPPORTED_EXTENSIONS:
                continue
            if fp.stat().st_size > MAX_IMAGE_SIZE:
                continue
            try:
                img = Image.open(fp)
                img.verify()
            except Exception:
                continue

            page_id = str(uuid.uuid4())[:8]
            page = {
                "page_id": page_id,
                "filename": fn,
                "stored_path": str(fp),
                "width": 0,
                "height": 0,
                "rotation": 0,
                "enhanced": False,
            }
            try:
                with Image.open(fp) as im:
                    w, h = im.size
                    page["width"] = w
                    page["height"] = h
            except Exception:
                pass

            pages.append(page)

        session["pages"].extend(pages)
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def add_image(
        self,
        file_path: Path,
        filename: str,
        request_id: str,
        position: Optional[int] = None,
    ) -> Dict[str, Any]:
        session = self._get_session(request_id)
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported format: {ext}")

        page_id = str(uuid.uuid4())[:8]
        page = {
            "page_id": page_id,
            "filename": filename,
            "stored_path": str(file_path),
            "width": 0,
            "height": 0,
            "rotation": 0,
            "enhanced": False,
        }
        try:
            with Image.open(file_path) as im:
                w, h = im.size
                page["width"] = w
                page["height"] = h
        except Exception:
            pass

        if position is not None and 0 <= position <= len(session["pages"]):
            session["pages"].insert(position, page)
        else:
            session["pages"].append(page)

        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def remove_page(self, request_id: str, page_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        session["pages"] = [p for p in session["pages"] if p["page_id"] != page_id]
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def duplicate_page(self, request_id: str, page_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for i, p in enumerate(session["pages"]):
            if p["page_id"] == page_id:
                import shutil
                new_id = str(uuid.uuid4())[:8]
                src = Path(p["stored_path"])
                dst = Paths.request_upload(request_id) / f"{new_id}_{p['filename']}"
                shutil.copy2(src, dst)
                dup = {**p, "page_id": new_id, "stored_path": str(dst)}
                session["pages"].insert(i + 1, dup)
                break
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def rotate_page(self, request_id: str, page_id: str, degrees: int) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for p in session["pages"]:
            if p["page_id"] == page_id:
                p["rotation"] = (p["rotation"] + degrees) % 360
                break
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def reorder_pages(self, request_id: str, new_order: List[str]) -> Dict[str, Any]:
        session = self._get_session(request_id)
        page_map = {p["page_id"]: p for p in session["pages"]}
        reordered = []
        for pid in new_order:
            if pid in page_map:
                reordered.append(page_map[pid])
        session["pages"] = reordered
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def _page_dicts(self, session: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = []
        for i, p in enumerate(session["pages"]):
            result.append({
                "index": i,
                "page_id": p["page_id"],
                "filename": p["filename"],
                "width": p["width"],
                "height": p["height"],
                "rotation": p["rotation"],
                "enhanced": p.get("enhanced", False),
            })
        return result

    def _load_image(self, path: str) -> np.ndarray:
        data = np.fromfile(path, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Cannot read image: {path}")
        return img

    def _save_image(self, img: np.ndarray, path: str, quality: int = 95) -> None:
        ext = Path(path).suffix.lower()
        params = []
        if ext in (".jpg", ".jpeg"):
            params = [cv2.IMWRITE_JPEG_QUALITY, quality]
        elif ext == ".png":
            params = [cv2.IMWRITE_PNG_COMPRESSION, 3]
        cv2.imwrite(path, img, params)

    def detect_document_edges(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edged = cv2.Canny(blurred, 30, 200)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(edged, kernel, iterations=2)
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return img
        largest = max(contours, key=cv2.contourArea)
        area = cv2.contourArea(largest)
        h, w = img.shape[:2]
        if area < (h * w * 0.1):
            return img
        peri = cv2.arcLength(largest, True)
        approx = cv2.approxPolyDP(largest, 0.02 * peri, True)
        if len(approx) == 4:
            return self._four_point_transform(img, approx.reshape(4, 2))
        return img

    def _four_point_transform(self, img: np.ndarray, pts: np.ndarray) -> np.ndarray:
        rect = self._order_points(pts)
        (tl, tr, br, bl) = rect
        width_a = np.linalg.norm(br - bl)
        width_b = np.linalg.norm(tr - tl)
        max_width = max(int(width_a), int(width_b))
        height_a = np.linalg.norm(tr - br)
        height_b = np.linalg.norm(tl - bl)
        max_height = max(int(height_a), int(height_b))
        if max_width <= 0 or max_height <= 0:
            return img
        dst = np.array([
            [0, 0], [max_width - 1, 0],
            [max_width - 1, max_height - 1], [0, max_height - 1]
        ], dtype="float32")
        M = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(img, M, (max_width, max_height))
        return warped

    def _order_points(self, pts: np.ndarray) -> np.ndarray:
        rect = np.zeros((4, 2), dtype="float32")
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]
        d = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(d)]
        rect[3] = pts[np.argmax(d)]
        return rect

    def auto_crop(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        coords = cv2.findNonZero(thresh)
        if coords is None:
            return img
        x, y, w, h = cv2.boundingRect(coords)
        margin = 5
        y1 = max(0, y - margin)
        y2 = min(img.shape[0], y + h + margin)
        x1 = max(0, x - margin)
        x2 = min(img.shape[1], x + w + margin)
        return img[y1:y2, x1:x2]

    def remove_borders(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return img
        largest = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(largest)
        return img[y:y + h, x:x + w]

    def deskew(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                                minLineLength=100, maxLineGap=10)
        if lines is None:
            return img
        angles = []
        for line in lines:
            coords = line[0] if line.ndim == 2 and line.shape[0] == 1 and line.shape[1] == 4 else line.flatten()
            x1, y1, x2, y2 = coords[:4]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            if abs(angle) < 15:
                angles.append(angle)
        if not angles:
            return img
        median_angle = np.median(angles)
        if abs(median_angle) < 0.5:
            return img
        h, w = img.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(img, M, (w, h),
                                 flags=cv2.INTER_CUBIC,
                                 borderMode=cv2.BORDER_REPLICATE)
        return rotated

    def remove_shadows(self, img: np.ndarray) -> np.ndarray:
        planes = cv2.split(img)
        result_planes = []
        for plane in planes:
            dilated = cv2.dilate(plane, np.ones((7, 7), np.uint8))
            bg = cv2.medianBlur(dilated, 21)
            diff = 255 - cv2.absdiff(plane, bg)
            normalized = cv2.normalize(diff, None, 0, 255, cv2.NORM_MINMAX)
            result_planes.append(normalized)
        return cv2.merge(result_planes)

    def denoise(self, img: np.ndarray) -> np.ndarray:
        return cv2.fastNlMeansDenoisingColored(img, None, 6, 6, 7, 21)

    def sharpen(self, img: np.ndarray) -> np.ndarray:
        kernel = np.array([[0, -0.5, 0],
                           [-0.5, 3, -0.5],
                           [0, -0.5, 0]])
        return cv2.filter2D(img, -1, kernel)

    def enhance_contrast(self, img: np.ndarray) -> np.ndarray:
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    def auto_white_balance(self, img: np.ndarray) -> np.ndarray:
        result = img.copy().astype(np.float64)
        for i in range(3):
            channel = result[:, :, i]
            low = np.percentile(channel, 0.5)
            high = np.percentile(channel, 99.5)
            if high - low < 1:
                continue
            channel = (channel - low) / (high - low) * 255.0
            result[:, :, i] = np.clip(channel, 0, 255)
        return result.astype(np.uint8)

    def auto_exposure(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        mean_val = np.mean(gray)
        target = 140.0
        if mean_val < 10 or mean_val > 245:
            return img
        gamma = np.log(target) / np.log(mean_val) if mean_val > 0 else 1.0
        gamma = np.clip(gamma, 0.3, 3.0)
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255
                          for i in range(256)]).astype("uint8")
        return cv2.LUT(img, table)

    def adaptive_threshold(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, 15, 8)
        return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)

    def morphology_clean(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        return cv2.cvtColor(cleaned, cv2.COLOR_GRAY2BGR)

    def full_enhance(self, img: np.ndarray) -> np.ndarray:
        img = self.detect_document_edges(img)
        img = self.auto_crop(img)
        img = self.remove_borders(img)
        img = self.deskew(img)
        img = self.remove_shadows(img)
        img = self.auto_white_balance(img)
        img = self.enhance_contrast(img)
        img = self.auto_exposure(img)
        img = self.sharpen(img)
        return img

    def enhance_page(self, request_id: str, page_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for p in session["pages"]:
            if p["page_id"] == page_id:
                img = self._load_image(p["stored_path"])
                enhanced = self.full_enhance(img)
                self._save_image(enhanced, p["stored_path"])
                p["enhanced"] = True
                h, w = enhanced.shape[:2]
                p["width"] = w
                p["height"] = h
                break
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def enhance_all(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        for p in session["pages"]:
            if not p.get("enhanced", False):
                try:
                    img = self._load_image(p["stored_path"])
                    enhanced = self.full_enhance(img)
                    self._save_image(enhanced, p["stored_path"])
                    p["enhanced"] = True
                    h, w = enhanced.shape[:2]
                    p["width"] = w
                    p["height"] = h
                except Exception as e:
                    logger.warning("Enhance failed for %s: %s", p["page_id"], e)
        return {
            "success": True,
            "pages": self._page_dicts(session),
            "total": len(session["pages"]),
        }

    def generate_thumbnail(
        self, request_id: str, page_id: str, max_size: int = 200
    ) -> Optional[bytes]:
        session = self._get_session(request_id)
        for p in session["pages"]:
            if p["page_id"] == page_id:
                try:
                    img = self._load_image(p["stored_path"])
                    h, w = img.shape[:2]
                    scale = min(max_size / w, max_size / h, 1.0)
                    if scale < 1.0:
                        img = cv2.resize(img, None, fx=scale, fy=scale,
                                         interpolation=cv2.INTER_AREA)
                    rotation = p.get("rotation", 0)
                    if rotation:
                        if rotation == 90:
                            img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                        elif rotation == 180:
                            img = cv2.rotate(img, cv2.ROTATE_180)
                        elif rotation == 270:
                            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
                    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 80])
                    return buf.tobytes()
                except Exception as e:
                    logger.warning("Thumbnail failed for %s: %s", page_id, e)
                    return None
        return None

    def _get_page_size(self, img: np.ndarray, page_size: str) -> Tuple[float, float]:
        h, w = img.shape[:2]
        img_ratio = w / h if h > 0 else 1.0

        # mm-based sizes for named paper
        sizes_mm = {
            "a4": (210, 297),
            "letter": (216, 279),
            "legal": (216, 356),
        }
        if page_size not in sizes_mm:
            return (w, h)

        DPI = 300
        MM_PER_INCH = 25.4
        px_per_mm = DPI / MM_PER_INCH  # ~11.811

        pw_mm, ph_mm = sizes_mm[page_size]
        pw_px = pw_mm * px_per_mm
        ph_px = ph_mm * px_per_mm

        pdf_ratio = pw_px / ph_px
        if img_ratio > pdf_ratio:
            new_w = pw_px
            new_h = pw_px / img_ratio
        else:
            new_h = ph_px
            new_w = ph_px * img_ratio
        return (new_w, new_h)

    def generate_pdf(
        self,
        request_id: str,
        page_size: str = "a4",
        orientation: str = "auto",
        quality: str = "high",
        compress: bool = False,
        color_mode: str = "color",
        output_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        session = self._get_session(request_id)
        if not session["pages"]:
            raise ValueError("No pages to process")

        quality_map = {"high": 98, "medium": 85, "compressed": 70}
        jpeg_quality = quality_map.get(quality, 95)

        # Determine layout for img2pdf
        layout = None
        if page_size in ("a4", "letter", "legal"):
            size_map = {"a4": "210mmx297mm", "letter": "8.5inx11in", "legal": "8.5inx14in"}
            rect = img2pdf.parse_pagesize_rectarg(size_map[page_size])
            layout = img2pdf.get_layout_fun(pagesize=rect)

        img_bytes_list = []
        for p in session["pages"]:
            img = self._load_image(p["stored_path"])
            rotation = p.get("rotation", 0)
            if rotation:
                if rotation == 90:
                    img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                elif rotation == 180:
                    img = cv2.rotate(img, cv2.ROTATE_180)
                elif rotation == 270:
                    img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)

            if color_mode == "grayscale":
                img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            elif color_mode == "bw":
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                img = cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)

            effective_size = orientation if orientation in ("portrait", "landscape") else None
            if effective_size:
                h_img, w_img = img.shape[:2]
                if effective_size == "portrait" and w_img > h_img:
                    img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                elif effective_size == "landscape" and h_img > w_img:
                    img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)

            if page_size == "original":
                pass
            else:
                page_w, page_h = self._get_page_size(img, page_size)
                h_img, w_img = img.shape[:2]
                if abs(page_w - w_img) > 2 or abs(page_h - h_img) > 2:
                    img = cv2.resize(img, (int(page_w), int(page_h)), interpolation=cv2.INTER_LANCZOS4)

            _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
            img_bytes_list.append(buf.tobytes())

        if compress:
            compressed_list = []
            for b in img_bytes_list:
                arr = np.frombuffer(b, dtype=np.uint8)
                decoded = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                _, cbuf = cv2.imencode(".jpg", decoded, [cv2.IMWRITE_JPEG_QUALITY, 60])
                compressed_list.append(cbuf.tobytes())
            img_bytes_list = compressed_list

        if layout:
            pdf_bytes = img2pdf.convert(img_bytes_list, layout_fun=layout)
        else:
            pdf_bytes = img2pdf.convert(img_bytes_list)

        out_name = output_name or output_filename(prefix="scan_")
        out_dir = Paths.request_output(request_id)
        out_path = out_dir / out_name
        out_path.write_bytes(pdf_bytes)

        file_size = out_path.stat().st_size
        session["output_filename"] = out_name

        return {
            "success": True,
            "message": "PDF generated successfully",
            "request_id": request_id,
            "filename": out_name,
            "download_url": f"/api/pdf/scan/download/{request_id}/{out_name}",
            "page_count": len(session["pages"]),
            "file_size": file_size,
            "file_size_human": self._human_size(file_size),
        }

    def generate_zip(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        if not session["pages"]:
            raise ValueError("No pages to export")

        zip_name = output_filename(prefix="scan_images_", extension=".zip")
        zip_dir = Paths.request_output(request_id)
        zip_path = zip_dir / zip_name

        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, p in enumerate(session["pages"]):
                try:
                    img = self._load_image(p["stored_path"])
                    rotation = p.get("rotation", 0)
                    if rotation:
                        if rotation == 90:
                            img = cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE)
                        elif rotation == 180:
                            img = cv2.rotate(img, cv2.ROTATE_180)
                        elif rotation == 270:
                            img = cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE)
                    ext = Path(p["filename"]).suffix.lower() or ".jpg"
                    if ext not in SUPPORTED_EXTENSIONS:
                        ext = ".jpg"
                    fname = f"page_{i + 1:03d}{ext}"
                    _, buf = cv2.imencode(ext, img)
                    zf.writestr(fname, buf.tobytes())
                except Exception as e:
                    logger.warning("ZIP export failed for page %d: %s", i, e)

        file_size = zip_path.stat().st_size
        return {
            "success": True,
            "filename": zip_name,
            "download_url": f"/api/pdf/scan/download/{request_id}/{zip_name}",
            "file_size": file_size,
            "file_size_human": self._human_size(file_size),
        }

    def get_status(self, request_id: str) -> Dict[str, Any]:
        session = self._get_session(request_id)
        return {
            "request_id": request_id,
            "page_count": len(session["pages"]),
            "pages": self._page_dicts(session),
            "processing": session.get("processing", False),
            "output_filename": session.get("output_filename"),
        }

    @staticmethod
    def _human_size(size: int) -> str:
        for unit in ("B", "KB", "MB", "GB"):
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"


scan_to_pdf_service = ScanToPDFService()

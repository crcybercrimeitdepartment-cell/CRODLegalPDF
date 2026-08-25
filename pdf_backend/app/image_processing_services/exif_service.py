import piexif
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import io
import logging
from app.schemas.exif_schema import ExifDataResponse, ExifDateTime, ExifCameraInfo, ExifCaptureSettings, ExifImageInfo, ExifLocation, ExifGeneral

logger = logging.getLogger(__name__)

def _get_ifd(exif_dict, ifd_name):
    return exif_dict.get(ifd_name, {})

def _to_rational(number):
    from fractions import Fraction
    if number is None:
        return (0, 1)
    f = Fraction(str(number)).limit_denominator(1000000)
    return (f.numerator, f.denominator)

def _convert_gps_to_rational(degrees):
    degrees = float(degrees)
    is_positive = degrees >= 0
    degrees = abs(degrees)
    d = int(degrees)
    m = int((degrees - d) * 60)
    s = (degrees - d - m/60) * 3600
    
    # Format required by piexif: ((deg_num, deg_den), (min_num, min_den), (sec_num, sec_den))
    return (
        (d, 1),
        (m, 1),
        (int(s * 100000), 100000)
    )

def _convert_rational_to_gps(rational_tuple):
    if not rational_tuple or len(rational_tuple) != 3:
        return None
    d = rational_tuple[0][0] / max(1, rational_tuple[0][1])
    m = rational_tuple[1][0] / max(1, rational_tuple[1][1])
    s = rational_tuple[2][0] / max(1, rational_tuple[2][1])
    return d + (m / 60.0) + (s / 3600.0)

def extract_exif(image_bytes: bytes, job_id: str, preview_url: str) -> dict:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        format_name = img.format
    except Exception:
        raise ValueError("Invalid image file")

    resp = ExifDataResponse(
        success=True,
        job_id=job_id,
        preview_url=preview_url,
        format=format_name,
        format_supported=format_name in ["JPEG", "MPO", "TIFF"]
    )
    
    resp.image_info.width = img.width
    resp.image_info.height = img.height

    if format_name not in ["JPEG", "MPO", "TIFF"]:
        # Limited support for PNG/WebP using Pillow
        try:
            raw_exif = img.getexif()
            if raw_exif:
                resp.raw_exif_exists = True
        except Exception as e:
            logger.warning(f"Failed to read raw EXIF for {format_name}: {e}")
        return resp.dict()

    try:
        exif_dict = piexif.load(image_bytes)
        resp.raw_exif_exists = True
    except piexif.InvalidImageDataError:
        return resp.dict()
    except Exception as e:
        logger.warning(f"EXIF parsing error: {e}")
        return resp.dict()

    # Parse 0th IFD (General/Camera Info)
    ifd0 = _get_ifd(exif_dict, "0th")
    resp.camera_info.make = ifd0.get(piexif.ImageIFD.Make, b"").decode('utf-8', 'ignore').strip() or None
    resp.camera_info.model = ifd0.get(piexif.ImageIFD.Model, b"").decode('utf-8', 'ignore').strip() or None
    resp.camera_info.software = ifd0.get(piexif.ImageIFD.Software, b"").decode('utf-8', 'ignore').strip() or None
    resp.general.artist = ifd0.get(piexif.ImageIFD.Artist, b"").decode('utf-8', 'ignore').strip() or None
    resp.general.copyright = ifd0.get(piexif.ImageIFD.Copyright, b"").decode('utf-8', 'ignore').strip() or None
    resp.general.description = ifd0.get(piexif.ImageIFD.ImageDescription, b"").decode('utf-8', 'ignore').strip() or None
    
    ori = ifd0.get(piexif.ImageIFD.Orientation)
    if ori:
        resp.image_info.orientation = f"Standard ({ori})"

    # Parse Exif IFD (Capture Settings / Dates)
    exif_ifd = _get_ifd(exif_dict, "Exif")
    resp.date_time.date_taken = exif_ifd.get(piexif.ExifIFD.DateTimeOriginal, b"").decode('utf-8', 'ignore').strip() or None
    resp.date_time.date_digitized = exif_ifd.get(piexif.ExifIFD.DateTimeDigitized, b"").decode('utf-8', 'ignore').strip() or None
    
    resp.camera_info.lens_make = exif_ifd.get(piexif.ExifIFD.LensMake, b"").decode('utf-8', 'ignore').strip() or None
    resp.camera_info.lens_model = exif_ifd.get(piexif.ExifIFD.LensModel, b"").decode('utf-8', 'ignore').strip() or None
    resp.general.user_comment = exif_ifd.get(piexif.ExifIFD.UserComment, b"").decode('utf-8', 'ignore').strip() or None

    iso = exif_ifd.get(piexif.ExifIFD.ISOSpeedRatings)
    if iso: resp.capture_settings.iso = str(iso)
    
    fnum = exif_ifd.get(piexif.ExifIFD.FNumber)
    if fnum and len(fnum) == 2 and fnum[1] != 0:
        resp.capture_settings.aperture = f"f/{fnum[0]/fnum[1]:.1f}"
        
    exptime = exif_ifd.get(piexif.ExifIFD.ExposureTime)
    if exptime and len(exptime) == 2 and exptime[1] != 0:
        resp.capture_settings.exposure_time = f"{exptime[0]}/{exptime[1]} s"
        
    focal = exif_ifd.get(piexif.ExifIFD.FocalLength)
    if focal and len(focal) == 2 and focal[1] != 0:
        resp.capture_settings.focal_length = f"{focal[0]/focal[1]:.1f} mm"

    # Parse GPS IFD
    gps_ifd = _get_ifd(exif_dict, "GPS")
    if gps_ifd:
        resp.location.has_gps = True
        
        lat_ref = gps_ifd.get(piexif.GPSIFD.GPSLatitudeRef, b"N").decode('ascii', 'ignore')
        lat = gps_ifd.get(piexif.GPSIFD.GPSLatitude)
        if lat:
            lat_deg = _convert_rational_to_gps(lat)
            if lat_deg is not None:
                resp.location.latitude = lat_deg if lat_ref == 'N' else -lat_deg
                
        lon_ref = gps_ifd.get(piexif.GPSIFD.GPSLongitudeRef, b"E").decode('ascii', 'ignore')
        lon = gps_ifd.get(piexif.GPSIFD.GPSLongitude)
        if lon:
            lon_deg = _convert_rational_to_gps(lon)
            if lon_deg is not None:
                resp.location.longitude = lon_deg if lon_ref == 'E' else -lon_deg

        alt_ref = gps_ifd.get(piexif.GPSIFD.GPSAltitudeRef, 0)
        alt = gps_ifd.get(piexif.GPSIFD.GPSAltitude)
        if alt and len(alt) == 2 and alt[1] != 0:
            alt_val = alt[0] / alt[1]
            resp.location.altitude = alt_val if alt_ref == 0 else -alt_val

    return resp.dict()


def process_exif(image_bytes: bytes, action: str, edit_data: dict = None) -> bytes:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        format_name = img.format
    except Exception:
        raise ValueError("Invalid image file")

    if format_name not in ["JPEG", "MPO", "TIFF"]:
        # For non-JPEG, just strip EXIF if requested, editing is too fragile
        if action == "remove_all":
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format=format_name, exif=b"")
            return img_byte_arr.getvalue()
        else:
            raise ValueError(f"Detailed EXIF editing is not safely supported for {format_name}.")

    # JPEG EXIF Editing via piexif
    try:
        exif_dict = piexif.load(image_bytes)
    except piexif.InvalidImageDataError:
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": None}

    if action == "remove_all":
        exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": None}
    
    elif action == "remove_gps":
        exif_dict["GPS"] = {}
        
    elif action == "edit" and edit_data:
        # Edit fields
        if "make" in edit_data and edit_data["make"] is not None:
            exif_dict["0th"][piexif.ImageIFD.Make] = edit_data["make"].encode('utf-8')
        if "model" in edit_data and edit_data["model"] is not None:
            exif_dict["0th"][piexif.ImageIFD.Model] = edit_data["model"].encode('utf-8')
        if "artist" in edit_data and edit_data["artist"] is not None:
            exif_dict["0th"][piexif.ImageIFD.Artist] = edit_data["artist"].encode('utf-8')
        if "copyright" in edit_data and edit_data["copyright"] is not None:
            exif_dict["0th"][piexif.ImageIFD.Copyright] = edit_data["copyright"].encode('utf-8')
        if "description" in edit_data and edit_data["description"] is not None:
            exif_dict["0th"][piexif.ImageIFD.ImageDescription] = edit_data["description"].encode('utf-8')
            
        if "date_original" in edit_data and edit_data["date_original"] is not None:
            exif_dict["Exif"][piexif.ExifIFD.DateTimeOriginal] = edit_data["date_original"].encode('utf-8')
        if "lens_make" in edit_data and edit_data["lens_make"] is not None:
            exif_dict["Exif"][piexif.ExifIFD.LensMake] = edit_data["lens_make"].encode('utf-8')
        if "lens_model" in edit_data and edit_data["lens_model"] is not None:
            exif_dict["Exif"][piexif.ExifIFD.LensModel] = edit_data["lens_model"].encode('utf-8')

        # GPS
        lat = edit_data.get("latitude")
        lon = edit_data.get("longitude")
        alt = edit_data.get("altitude")
        
        if lat is not None or lon is not None:
            if "GPS" not in exif_dict:
                exif_dict["GPS"] = {}
                
            if lat is not None:
                exif_dict["GPS"][piexif.GPSIFD.GPSLatitudeRef] = b"N" if lat >= 0 else b"S"
                exif_dict["GPS"][piexif.GPSIFD.GPSLatitude] = _convert_gps_to_rational(lat)
            
            if lon is not None:
                exif_dict["GPS"][piexif.GPSIFD.GPSLongitudeRef] = b"E" if lon >= 0 else b"W"
                exif_dict["GPS"][piexif.GPSIFD.GPSLongitude] = _convert_gps_to_rational(lon)
                
            if alt is not None:
                exif_dict["GPS"][piexif.GPSIFD.GPSAltitudeRef] = 0 if alt >= 0 else 1
                exif_dict["GPS"][piexif.GPSIFD.GPSAltitude] = _to_rational(abs(alt))

    try:
        exif_bytes = piexif.dump(exif_dict)
    except Exception as e:
        logger.error(f"Failed to dump EXIF: {e}")
        # Clean dict to prevent crash
        exif_bytes = piexif.dump({"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": None})

    img_byte_arr = io.BytesIO()
    # Save using Pillow with exif
    # Or simply insert into original bytes to avoid recompression
    try:
        if exif_bytes == b"Exif\x00\x00MM\x00*\x00\x00\x00\x08\x00\x00\x00\x00\x00\x00" or exif_bytes == b"Exif\x00\x00II*\x00\x08\x00\x00\x00\x00\x00\x00\x00\x00\x00":
            # Just remove EXIF completely using Pillow (safest method)
            out = io.BytesIO()
            info = img.info.copy()
            info.pop('exif', None)
            img.save(out, format=format_name, quality="keep", **info)
            return out.getvalue()
        
        out = io.BytesIO()
        piexif.insert(exif_bytes, image_bytes, out)
        return out.getvalue()
    except Exception as e:
        logger.error(f"Piexif insert failed: {e}")
        # Fallback to Pillow save if piexif insert fails
        img.save(img_byte_arr, format=format_name, exif=exif_bytes, quality="keep")
        return img_byte_arr.getvalue()

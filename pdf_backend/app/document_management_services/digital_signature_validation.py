"""
Digital Signature Validation Service — Enterprise-Grade.

Uses pyHanko for cryptographic PKCS#7/CAdES signature verification,
certificate chain validation, and timestamp verification.
Uses cryptography library for X.509 certificate parsing.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 200 * 1024 * 1024  # 200 MB


class DigitalSignatureValidationService:
    """Validates digital signatures in PDF documents using pyHanko."""

    def _fmt_size(self, size_bytes: int) -> str:
        if size_bytes <= 0:
            return "0 B"
        units = ["B", "KB", "MB", "GB"]
        i = 0
        s = float(size_bytes)
        while s >= 1024 and i < len(units) - 1:
            s /= 1024
            i += 1
        return f"{s:.1f} {units[i]}"

    def _issue(self, severity: str, title: str, description: str,
               action: str = "") -> Dict[str, Any]:
        issue: Dict[str, Any] = {
            "severity": severity,
            "title": title,
            "description": description,
        }
        if action:
            issue["action"] = action
        return issue

    def _extract_cert_details(self, cert) -> Dict[str, Any]:
        """Extract certificate details using cryptography.x509."""
        try:
            from cryptography import x509 as crypto_x509

            cert_der = cert.dump()
            crypto_cert = crypto_x509.load_der_x509_certificate(cert_der)

            def _attr(oid):
                try:
                    attrs = crypto_cert.subject.get_attributes_for_oid(oid)
                    return attrs[0].value if attrs else ""
                except Exception:
                    return ""

            def _issuer_attr(oid):
                try:
                    attrs = crypto_cert.issuer.get_attributes_for_oid(oid)
                    return attrs[0].value if attrs else ""
                except Exception:
                    return ""

            now = datetime.now(timezone.utc)
            valid_from = crypto_cert.not_valid_before_utc
            valid_to = crypto_cert.not_valid_after_utc
            is_expired = valid_to < now
            is_not_yet_valid = valid_from > now

            return {
                "signer_name": _attr(crypto_x509.NameOID.COMMON_NAME),
                "signer_email": _attr(crypto_x509.NameOID.EMAIL_ADDRESS),
                "organization": _attr(crypto_x509.NameOID.ORGANIZATION_NAME),
                "organizational_unit": _attr(crypto_x509.NameOID.ORGANIZATIONAL_UNIT_NAME),
                "country": _attr(crypto_x509.NameOID.COUNTRY_NAME),
                "state": _attr(crypto_x509.NameOID.STATE_OR_PROVINCE_NAME),
                "locality": _attr(crypto_x509.NameOID.LOCALITY_NAME),
                "issuer_common_name": _issuer_attr(crypto_x509.NameOID.COMMON_NAME),
                "issuer_organization": _issuer_attr(crypto_x509.NameOID.ORGANIZATION_NAME),
                "serial_number": str(crypto_cert.serial_number),
                "valid_from": valid_from.isoformat(),
                "valid_to": valid_to.isoformat(),
                "is_expired": is_expired,
                "is_not_yet_valid": is_not_yet_valid,
                "self_signed": crypto_cert.issuer == crypto_cert.subject,
                "signature_algorithm": crypto_cert.signature_algorithm_oid._name or crypto_cert.signature_algorithm_oid.dotted_string,
                "not_before": valid_from.isoformat(),
                "not_after": valid_to.isoformat(),
            }
        except Exception as e:
            logger.warning(f"Certificate parsing error: {e}")
            return {
                "signer_name": "",
                "issuer_organization": "",
                "error": str(e)[:300],
            }

    def _build_checks(self, status, timestamp_status=None) -> List[Dict[str, Any]]:
        """Build individual validation check results."""
        checks = []

        checks.append({
            "name": "Signature Integrity (Hash Verification)",
            "passed": bool(status.intact),
            "detail": "Signed hash matches document content — document was NOT modified after signing"
                     if status.intact
                     else "Document was MODIFIED after signing — signature integrity compromised",
        })

        checks.append({
            "name": "Cryptographic Verification",
            "passed": bool(status.valid),
            "detail": "Signature cryptographically verified (PKCS#7 / CAdES)"
                     if status.valid
                     else "Cryptographic signature verification failed",
        })

        checks.append({
            "name": "Certificate Chain Validation",
            "passed": bool(status.trusted),
            "detail": "Signer certificate chain verified to trusted root CA"
                     if status.trusted
                     else "Certificate chain could NOT be verified to a trusted root CA",
        })

        if hasattr(status, "md_algorithm") and status.md_algorithm:
            checks.append({
                "name": "Hash Algorithm",
                "passed": True,
                "detail": f"Signed with: {status.md_algorithm}",
            })

        if hasattr(status, "pkcs7_signature_mechanism") and status.pkcs7_signature_mechanism:
            checks.append({
                "name": "Signature Mechanism",
                "passed": True,
                "detail": f"Algorithm: {status.pkcs7_signature_mechanism}",
            })

        if status.coverage is not None:
            coverage_str = str(status.coverage).split(".")[-1] if hasattr(status.coverage, "name") else str(status.coverage)
            checks.append({
                "name": "Signature Coverage",
                "passed": "COVERS" in coverage_str.upper() if isinstance(coverage_str, str) else True,
                "detail": f"Coverage level: {coverage_str}",
            })

        if status.docmdp_ok is not None:
            checks.append({
                "name": "Document Modification Detection (DMD)",
                "passed": bool(status.docmdp_ok),
                "detail": "No unauthorized modifications detected"
                         if status.docmdp_ok
                         else "Unauthorized modifications detected after signing",
            })

        if timestamp_status is not None:
            ts_intact = getattr(timestamp_status, "intact", False)
            ts_valid = getattr(timestamp_status, "valid", False)
            ts_trusted = getattr(timestamp_status, "trusted", False)
            checks.append({
                "name": "TSA Timestamp Verification",
                "passed": ts_intact and ts_valid and ts_trusted,
                "detail": "TSA timestamp validated — signing time independently confirmed"
                         if (ts_intact and ts_valid and ts_trusted)
                         else "TSA timestamp validation failed or not present",
            })

        return checks

    def _validate_with_pyhanko(self, pdf_bytes: bytes) -> Tuple[List[Dict], List[Dict]]:
        """Validate signatures using pyHanko."""
        sig_results = []
        issues = []

        try:
            from pyhanko.pdf_utils.reader import PdfFileReader
            from pyhanko.sign.validation import validate_pdf_signature
        except ImportError as e:
            issues.append(self._issue(
                "error", "pyHanko not available",
                f"Required library not installed: {e}",
                "Install pyHanko: pip install pyhanko[validation]",
            ))
            return sig_results, issues

        try:
            reader = PdfFileReader(io.BytesIO(pdf_bytes))
        except Exception as e:
            issues.append(self._issue(
                "error", "PDF reading failed",
                f"Could not open PDF with pyHanko: {str(e)[:300]}",
            ))
            return sig_results, issues

        try:
            sigs = list(reader.embedded_signatures)
        except Exception as e:
            issues.append(self._issue(
                "warning", "Signature enumeration failed",
                f"Could not enumerate embedded signatures: {str(e)[:300]}",
            ))
            return sig_results, issues

        if not sigs:
            return sig_results, issues

        for sig_field in sigs:
            try:
                status = validate_pdf_signature(reader, sig_field)

                cert = status.signing_cert
                cert_details = self._extract_cert_details(cert)

                # Extract signing time from signature object
                signing_time = ""
                try:
                    sig_obj = sig_field.sig_object
                    if sig_obj and "/M" in sig_obj:
                        m_val = sig_obj["/M"]
                        if hasattr(m_val, "original_bytes"):
                            signing_time = m_val.original_bytes.decode("latin-1", errors="ignore")
                        else:
                            signing_time = str(m_val)
                except Exception:
                    pass

                # Extract reason and location
                reason = ""
                location = ""
                try:
                    sig_obj = sig_field.sig_object
                    if sig_obj:
                        if "/Reason" in sig_obj:
                            reason = str(sig_obj["/Reason"])
                        if "/Location" in sig_obj:
                            location = str(sig_obj["/Location"])
                except Exception:
                    pass

                # Get field name
                field_name = ""
                try:
                    field_name = sig_field.sig_field_name or ""
                except Exception:
                    field_name = "Unknown"

                # Check timestamp
                timestamp_status = None
                if hasattr(status, "timestamp_validity") and status.timestamp_validity is not None:
                    timestamp_status = status.timestamp_validity

                validation_checks = self._build_checks(status, timestamp_status)

                sig_result = {
                    "field_name": field_name,
                    "intact": bool(status.intact),
                    "valid": bool(status.valid),
                    "trusted": bool(status.trusted),
                    "signing_time": signing_time,
                    "reason": reason,
                    "location": location,
                    "filter": "",
                    "sub_filter": "",
                    "md_algorithm": str(status.md_algorithm) if status.md_algorithm else "",
                    "signature_mechanism": str(status.pkcs7_signature_mechanism) if status.pkcs7_signature_mechanism else "",
                    "coverage": str(status.coverage).split(".")[-1] if status.coverage else None,
                    "docmdp_ok": bool(status.docmdp_ok) if status.docmdp_ok is not None else None,
                    "certificate": cert_details,
                    "timestamp": {
                        "present": timestamp_status is not None,
                        "intact": bool(timestamp_status.intact) if timestamp_status else False,
                        "valid": bool(timestamp_status.valid) if timestamp_status else False,
                        "trusted": bool(timestamp_status.trusted) if timestamp_status else False,
                    } if timestamp_status else None,
                    "validation_checks": validation_checks,
                    "has_signature_contents": True,
                }

                sig_results.append(sig_result)

                if not status.intact:
                    issues.append(self._issue(
                        "error",
                        f"Signature integrity failed: {field_name}",
                        "The document was modified after this signature was applied.",
                        "Obtain an unmodified copy of the signed document.",
                    ))
                if not status.valid:
                    issues.append(self._issue(
                        "error",
                        f"Signature invalid: {field_name}",
                        "Cryptographic verification of the signature failed.",
                        "The signature may have been tampered with or the signing algorithm is unsupported.",
                    ))
                if not status.trusted:
                    issues.append(self._issue(
                        "warning",
                        f"Signer not trusted: {field_name}",
                        "The signer's certificate chain could not be verified to a trusted root CA.",
                        "The certificate may be self-signed or from an untrusted Certificate Authority.",
                    ))

            except Exception as e:
                field_name = ""
                try:
                    field_name = sig_field.sig_field_name or "Unknown"
                except Exception:
                    field_name = "Unknown"

                sig_results.append({
                    "field_name": field_name,
                    "intact": False,
                    "valid": False,
                    "trusted": False,
                    "has_signature_contents": False,
                    "error": str(e)[:500],
                    "validation_checks": [{
                        "name": "Cryptographic Verification",
                        "passed": False,
                        "detail": str(e)[:300],
                    }],
                })
                issues.append(self._issue(
                    "error",
                    f"Validation error: {field_name}",
                    str(e)[:300],
                ))

        return sig_results, issues

    def _extract_metadata_from_fitz(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """Extract PDF metadata using PyMuPDF."""
        metadata = {
            "page_count": 0,
            "pdf_version": "",
            "is_encrypted": False,
            "fitz_signatures": [],
        }

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            metadata["page_count"] = doc.page_count
            metadata["is_encrypted"] = doc.is_encrypted

            try:
                header = pdf_bytes[:20].decode("latin-1", errors="ignore").split("\n")[0]
                if "%PDF-" in header:
                    metadata["pdf_version"] = header.split("%PDF-")[1].strip()
            except Exception:
                pass

            # Extract signature field metadata via AcroForm
            for page_num in range(doc.page_count):
                try:
                    page = doc.load_page(page_num)
                    for widget in page.widgets():
                        if widget is None:
                            continue
                        field_type = widget.field_type_string or ""
                        field_name = widget.field_name or ""
                        try:
                            if widget.field_type == 5:  # Signature
                                sig_meta = {
                                    "field_name": field_name,
                                    "field_type": field_type or "Signature",
                                    "page": page_num + 1,
                                }
                                try:
                                    widget_xref = widget.xref
                                    if widget_xref:
                                        widget_obj = doc.xref_object(widget_xref, compressed=False)
                                        import re
                                        time_match = re.search(r'/M\s*\(D:(\d{14})', widget_obj)
                                        if time_match:
                                            ts = time_match.group(1)
                                            sig_meta["signing_time"] = f"{ts[0:4]}-{ts[4:6]}-{ts[6:8]} {ts[8:10]}:{ts[10:12]}:{ts[12:14]}"
                                        reason_match = re.search(r'/Reason\s*\(([^)]*)\)', widget_obj)
                                        location_match = re.search(r'/Location\s*\(([^)]*)\)', widget_obj)
                                        sig_meta["reason"] = reason_match.group(1) if reason_match else ""
                                        sig_meta["location"] = location_match.group(1) if location_match else ""
                                        filter_match = re.search(r'/Filter\s*/(\S+)', widget_obj)
                                        subfilter_match = re.search(r'/SubFilter\s*/(\S+)', widget_obj)
                                        sig_meta["filter"] = filter_match.group(1) if filter_match else ""
                                        sig_meta["sub_filter"] = subfilter_match.group(1) if subfilter_match else ""
                                except Exception:
                                    pass
                                metadata["fitz_signatures"].append(sig_meta)
                        except Exception:
                            continue
                except Exception:
                    continue

            doc.close()
        except Exception as e:
            logger.warning(f"PyMuPDF metadata extraction error: {e}")

        return metadata

    def validate(self, pdf_bytes: bytes, original_filename: str = "") -> Dict[str, Any]:
        """Run full enterprise-grade digital signature validation."""
        issues: List[Dict[str, Any]] = []
        file_size = len(pdf_bytes)
        filename = original_filename or "uploaded.pdf"

        # ── File-level checks ──────────────────────────────────────────────
        if file_size == 0:
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "Empty file", "The uploaded file has no data.",
                    action="Upload a valid PDF file."
                )]
            )

        if file_size > MAX_FILE_SIZE:
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "File too large",
                    f"File size ({self._fmt_size(file_size)}) exceeds the {self._fmt_size(MAX_FILE_SIZE)} limit.",
                    action="Upload a smaller file."
                )]
            )

        if not pdf_bytes[:5].startswith(b"%PDF"):
            return self._build_report(
                filename=filename, file_size=file_size,
                status="Invalid", issues=[self._issue(
                    "error", "Not a PDF file",
                    "The file does not start with the %PDF signature header.",
                    action="Ensure the file is a valid PDF."
                )]
            )

        # ── Phase 1: PyMuPDF metadata extraction ─────────────────────────
        fitz_meta = self._extract_metadata_from_fitz(pdf_bytes)

        if fitz_meta["is_encrypted"]:
            issues.append(self._issue(
                "warning", "Encrypted PDF",
                "The PDF is encrypted. Signature detection may be limited.",
                action="Decrypt the PDF before signature validation if possible."
            ))

        # ── Phase 2: PyHanko cryptographic verification ───────────────────
        pyhanko_sigs, pyhanko_issues = self._validate_with_pyhanko(pdf_bytes)
        issues.extend(pyhanko_issues)

        # ── Phase 3: Merge results ────────────────────────────────────────
        merged_signatures = []

        if pyhanko_sigs:
            # PyHanko results are authoritative
            for ps in pyhanko_sigs:
                # Enrich with fitz metadata (reason, location, signing_time from AcroForm)
                fitz_match = None
                for fs in fitz_meta.get("fitz_signatures", []):
                    if fs.get("field_name") == ps.get("field_name"):
                        fitz_match = fs
                        break

                if fitz_match:
                    if not ps.get("reason") and fitz_match.get("reason"):
                        ps["reason"] = fitz_match["reason"]
                    if not ps.get("location") and fitz_match.get("location"):
                        ps["location"] = fitz_match["location"]
                    if not ps.get("signing_time") and fitz_match.get("signing_time"):
                        ps["signing_time"] = fitz_match["signing_time"]
                    if not ps.get("filter") and fitz_match.get("filter"):
                        ps["filter"] = fitz_match["filter"]
                    if not ps.get("sub_filter") and fitz_match.get("sub_filter"):
                        ps["sub_filter"] = fitz_match["sub_filter"]
                    if not ps.get("page"):
                        ps["page"] = fitz_match.get("page")

                merged_signatures.append(ps)
        else:
            # Fallback: use fitz metadata only (no cryptographic verification)
            for fs in fitz_meta.get("fitz_signatures", []):
                fs["intact"] = None
                fs["valid"] = None
                fs["trusted"] = None
                fs["has_signature_contents"] = False
                fs["certificate"] = {}
                fs["validation_checks"] = [{
                    "name": "Cryptographic Verification",
                    "passed": None,
                    "detail": "Could not perform cryptographic verification — pyHanko could not process this signature",
                }]
                merged_signatures.append(fs)

        # ── Determine overall status ──────────────────────────────────────
        if not merged_signatures:
            overall_status = "No Signatures"
        elif any(s.get("error") for s in merged_signatures):
            overall_status = "Error"
        elif any(not s.get("intact") for s in merged_signatures):
            overall_status = "Invalid"
        elif any(not s.get("valid") for s in merged_signatures):
            overall_status = "Invalid"
        elif any(not s.get("trusted") for s in merged_signatures):
            overall_status = "Untrusted"
        else:
            overall_status = "Valid"

        # Add info about no signatures
        if not merged_signatures:
            issues.append(self._issue(
                "info", "No digital signatures detected",
                "This PDF does not contain any digital signature fields.",
                action="If you expected signatures, the PDF may have been flattened."
            ))

        # ── Build report ───────────────────────────────────────────────────
        error_count = sum(1 for i in issues if i["severity"] == "error")
        warning_count = sum(1 for i in issues if i["severity"] == "warning")
        info_count = sum(1 for i in issues if i["severity"] == "info")

        return self._build_report(
            filename=filename,
            file_size=file_size,
            status=overall_status,
            issues=issues,
            error_count=error_count,
            warning_count=warning_count,
            info_count=info_count,
            signature_count=len(merged_signatures),
            signatures=merged_signatures,
            page_count=fitz_meta["page_count"],
            pdf_version=fitz_meta["pdf_version"],
            is_encrypted=fitz_meta["is_encrypted"],
        )

    def _build_report(
        self,
        filename: str = "",
        file_size: int = 0,
        status: str = "No Signatures",
        issues: Optional[List[Dict[str, Any]]] = None,
        error_count: int = 0,
        warning_count: int = 0,
        info_count: int = 0,
        signature_count: int = 0,
        signatures: Optional[List[Dict[str, Any]]] = None,
        page_count: int = 0,
        pdf_version: str = "",
        is_encrypted: bool = False,
    ) -> Dict[str, Any]:
        return {
            "filename": filename,
            "file_size": file_size,
            "file_size_human": self._fmt_size(file_size),
            "status": status,
            "error_count": error_count,
            "warning_count": warning_count,
            "info_count": info_count,
            "signature_count": signature_count,
            "signatures": signatures or [],
            "page_count": page_count,
            "pdf_version": pdf_version,
            "is_encrypted": is_encrypted,
            "issues": issues or [],
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }


digital_signature_validation_service = DigitalSignatureValidationService()

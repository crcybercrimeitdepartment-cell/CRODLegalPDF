import logging
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
import json

import fitz  # PyMuPDF
from app.core.paths import Paths
from app.utils.filename import output_filename

logger = logging.getLogger(__name__)

class ReorderBookmarksAfterPageChangesService:
    """
    Enterprise-grade bookmark management service that automatically recalculates and
    updates PDF bookmarks and internal links after page modifications while preserving
    hierarchy, formatting, and metadata.
    """

    async def analyze(self, pdf_path: Path) -> Dict[str, Any]:
        """Analyze PDF and extract comprehensive bookmark/link/metadata statistics."""
        logger.info(f"Analyzing bookmarks for {pdf_path.name}")
        
        try:
            with fitz.open(str(pdf_path)) as doc:
                page_count = doc.page_count
                toc = doc.get_toc(simple=False)
                metadata = doc.metadata or {}
                
                bookmark_count = len(toc)
                max_depth = max([item[0] for item in toc]) if toc else 0
                
                # We need to construct the tree structure for the frontend
                # toc format: [lvl, title, page, dest_dict]
                tree = []
                # Fast linear to tree
                stack = []
                
                root_count = 0
                child_count = 0
                grandchild_count = 0
                named_dest_count = 0
                goto_dest_count = 0
                uri_dest_count = 0
                launch_dest_count = 0
                broken_dest_count = 0
                out_of_range_count = 0
                collapsed_count = 0
                expanded_count = 0
                missing_dest_count = 0
                
                dest_set = set()
                duplicate_dest_count = 0
                
                for item in toc:
                    lvl = item[0]
                    dest_dict = item[3]
                    
                    # Collapse state
                    if dest_dict.get("collapse"):
                        collapsed_count += 1
                    else:
                        expanded_count += 1
                        
                    node = {
                        "level": lvl,
                        "title": item[1],
                        "page": item[2],
                        "dest": dest_dict,
                        "collapse": dest_dict.get("collapse", False)
                    }
                    
                    if lvl == 1:
                        root_count += 1
                    elif lvl == 2:
                        child_count += 1
                    else:
                        grandchild_count += 1
                        
                    kind = dest_dict.get("kind", -1)
                    if kind == fitz.LINK_NAMED:
                        named_dest_count += 1
                    elif kind == fitz.LINK_GOTO:
                        goto_dest_count += 1
                    elif kind == fitz.LINK_URI:
                        uri_dest_count += 1
                    elif kind == fitz.LINK_LAUNCH:
                        launch_dest_count += 1
                        
                    if item[2] == -1 and kind != fitz.LINK_URI:
                        broken_dest_count += 1
                        missing_dest_count += 1
                    elif item[2] > page_count:
                        out_of_range_count += 1
                        
                    # Duplicates
                    dest_tuple = (item[2], kind)
                    if dest_tuple in dest_set and item[2] != -1:
                        duplicate_dest_count += 1
                    dest_set.add(dest_tuple)

                    tree.append(node)
                
                # Extract links count across document (rough estimate for large docs)
                internal_links_count = 0
                for page in doc:
                    links = page.get_links()
                    for link in links:
                        if link["kind"] == fitz.LINK_GOTO:
                            internal_links_count += 1

                return {
                    "success": True,
                    "file_size": pdf_path.stat().st_size,
                    "page_count": page_count,
                    "metadata": {
                        "title": metadata.get("title", ""),
                        "author": metadata.get("author", ""),
                        "subject": metadata.get("subject", ""),
                        "keywords": metadata.get("keywords", ""),
                        "creator": metadata.get("creator", ""),
                        "producer": metadata.get("producer", ""),
                        "creationDate": metadata.get("creationDate", ""),
                        "modDate": metadata.get("modDate", ""),
                        "encryption": "Yes" if doc.is_encrypted else "No",
                        "password_protected": "Yes" if doc.needs_pass else "No"
                    },
                    "analysis": {
                        "bookmark_count": bookmark_count,
                        "max_depth": max_depth,
                        "root_count": root_count,
                        "child_count": child_count,
                        "grandchild_count": grandchild_count,
                        "named_dest_count": named_dest_count,
                        "goto_dest_count": goto_dest_count,
                        "uri_dest_count": uri_dest_count,
                        "launch_dest_count": launch_dest_count,
                        "broken_dest_count": broken_dest_count,
                        "out_of_range_count": out_of_range_count,
                        "collapsed_count": collapsed_count,
                        "expanded_count": expanded_count,
                        "missing_dest_count": missing_dest_count,
                        "duplicate_dest_count": duplicate_dest_count,
                        "internal_links_count": internal_links_count,
                    },
                    "tree": tree
                }
        except Exception as e:
            logger.exception("Failed to analyze PDF bookmarks")
            raise ValueError(f"Failed to load PDF: {e}")

    async def process(
        self,
        input_pdf: Path,
        request_id: str,
        page_mapping: str, 
        preserve_hierarchy: bool = True,
        preserve_metadata: bool = True,
        preserve_titles: bool = True,
        preserve_colors: bool = True,
        preserve_bold: bool = True,
        preserve_italic: bool = True,
        preserve_zoom: bool = True,
        preserve_view_mode: bool = True,
        preserve_named_dest: bool = True,
        preserve_page_labels: bool = True,
        preserve_expand_state: bool = True,
        preserve_collapse_state: bool = True,
        update_internal_links: bool = True,
        update_goto_links: bool = True,
        repair_invalid_dests: bool = True,
        repair_broken_refs: bool = True,
        repair_named_dests: bool = True,
        remove_invalid_bookmarks: bool = True,
        skip_unsupported_actions: bool = True,
        validate_after_update: bool = True,
        generate_validation_report: bool = True,
        optimize_output_pdf: bool = True
    ) -> Dict[str, Any]:
        
        start_time = time.perf_counter()
        logger.info(f"Processing enterprise bookmark reorder for {input_pdf.name}")

        try:
            mapping = json.loads(page_mapping)
            mapping_dict = {int(k): int(v) for k, v in mapping.items()}
        except Exception as e:
            raise ValueError(f"Invalid page mapping format: {e}")

        out_dir = Paths.request_output(request_id)
        out_name = output_filename(prefix="reordered_bookmarks_ent_")
        out_path = out_dir / out_name

        warnings_log = []

        try:
            doc = fitz.open(str(input_pdf))
            old_page_count = doc.page_count
            
            toc = doc.get_toc(simple=False)
            new_toc = []
            
            stats = {
                "bookmarks_updated": 0,
                "bookmarks_repaired": 0,
                "bookmarks_removed": 0,
                "bookmarks_unchanged": 0,
                "internal_links_updated": 0,
                "named_destinations_updated": 0,
                "metadata_preserved": preserve_metadata,
                "hierarchy_preserved": preserve_hierarchy
            }

            for item in toc:
                lvl = item[0]
                title = item[1]
                page_num = item[2]
                dest_dict = item[3]

                if not preserve_colors:
                    dest_dict.pop("color", None)
                if not preserve_bold:
                    dest_dict.pop("bold", None)
                if not preserve_italic:
                    dest_dict.pop("italic", None)
                if not preserve_zoom:
                    dest_dict.pop("zoom", None)
                    dest_dict["kind"] = fitz.LINK_GOTO
                if not preserve_collapse_state:
                    dest_dict.pop("collapse", None)

                # Process Page Destination
                if page_num > 0:
                    old_idx = page_num - 1
                    if old_idx in mapping_dict:
                        new_idx = mapping_dict[old_idx]
                        if new_idx >= 0:
                            if new_idx != old_idx:
                                stats["bookmarks_updated"] += 1
                            else:
                                stats["bookmarks_unchanged"] += 1
                            item[2] = new_idx + 1
                            new_toc.append(item)
                        else:
                            # Deleted
                            if remove_invalid_bookmarks:
                                stats["bookmarks_removed"] += 1
                                warnings_log.append(f"Removed invalid bookmark '{title}' pointing to deleted page {page_num}.")
                                continue
                            elif repair_invalid_dests:
                                repaired_idx = self._find_nearest_valid_page(old_idx, mapping_dict, old_page_count)
                                if repaired_idx >= 0:
                                    item[2] = repaired_idx + 1
                                    stats["bookmarks_repaired"] += 1
                                    warnings_log.append(f"Repaired broken bookmark '{title}' from page {page_num} to {repaired_idx+1}.")
                                    new_toc.append(item)
                                else:
                                    warnings_log.append(f"Could not repair bookmark '{title}', no valid page found.")
                                    if not remove_invalid_bookmarks:
                                        new_toc.append(item)
                            else:
                                warnings_log.append(f"Kept invalid bookmark '{title}' pointing to deleted page.")
                                new_toc.append(item)
                    else:
                        stats["bookmarks_unchanged"] += 1
                        new_toc.append(item)
                else:
                    new_toc.append(item)

            if preserve_hierarchy:
                doc.set_toc(new_toc)
            else:
                flat_toc = [[1, item[1], item[2], item[3]] for item in new_toc]
                doc.set_toc(flat_toc)

            # Update Internal Links
            if update_internal_links or update_goto_links:
                for page in doc:
                    links = page.get_links()
                    for link in links:
                        if link["kind"] == fitz.LINK_GOTO:
                            old_dest_page = link.get("page", -1)
                            if old_dest_page in mapping_dict:
                                new_dest_page = mapping_dict[old_dest_page]
                                if new_dest_page >= 0:
                                    link["page"] = new_dest_page
                                    page.update_link(link)
                                    stats["internal_links_updated"] += 1
                                elif remove_invalid_bookmarks:
                                    page.delete_link(link)
                                elif repair_invalid_dests:
                                    repaired_idx = self._find_nearest_valid_page(old_dest_page, mapping_dict, old_page_count)
                                    if repaired_idx >= 0:
                                        link["page"] = repaired_idx
                                        page.update_link(link)
                                        stats["internal_links_updated"] += 1

            # Save PDF
            garbage_opt = 4 if optimize_output_pdf else (0 if preserve_metadata else 1)
            doc.save(str(out_path), garbage=garbage_opt)
            out_pages = doc.page_count
            doc.close()

            processing_time = time.perf_counter() - start_time
            out_size = out_path.stat().st_size
            in_size = input_pdf.stat().st_size
            comp_ratio = f"{((in_size - out_size) / in_size * 100):.1f}%" if in_size else "0%"

            result = {
                "success": True,
                "request_id": request_id,
                "filename": out_name,
                "stats": stats,
                "processing_time": f"{processing_time:.2f}s",
                "output_pages": out_pages,
                "output_size": out_size,
                "compression_ratio": comp_ratio,
                "warnings": warnings_log
            }
            
            # Generate Report if requested
            if generate_validation_report:
                report_path = out_dir / "validation_report.json"
                with open(report_path, "w") as f:
                    json.dump(result, f, indent=4)
                result["report_filename"] = "validation_report.json"

            return result

        except Exception as e:
            logger.exception("Failed to process enterprise bookmark reordering")
            raise ValueError(f"Bookmark processing failed: {e}")

    def _find_nearest_valid_page(self, old_idx: int, mapping_dict: Dict[int, int], max_pages: int) -> int:
        for i in range(old_idx - 1, -1, -1):
            if i in mapping_dict and mapping_dict[i] >= 0:
                return mapping_dict[i]
        for i in range(old_idx + 1, max_pages):
            if i in mapping_dict and mapping_dict[i] >= 0:
                return mapping_dict[i]
        return -1

_reorder_bookmarks_service = ReorderBookmarksAfterPageChangesService()

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { X, Trash2, MessageSquare, ChevronDown, ChevronRight, Pencil, Square, Circle, Minus, Type, Hash, Maximize, Milestone, Highlighter, Ruler, CornerDownRight, Send, CheckCircle, Filter, Search, Info, Sliders, ArrowRight, Stamp, ClipboardCheck, History, DownloadCloud, UploadCloud, PenTool, ListTodo, Underline, Strikethrough, Activity, AlignLeft, Hexagon, Cloud, PieChart, Underline as UnderlineIcon, Strikethrough as StrikeIcon, Activity as SquigglyIcon, Settings2, MousePointer2, Undo2, Redo2, ZoomIn, ZoomOut, Upload, Download, ArrowLeft, MessageCircle, HelpCircle, Key, XCircle, Star, PenLine, FileText, FileJson, Table2, Edit3, AlertCircle, RefreshCcw, Palette, Clock, User, Fingerprint, Tag, Printer, LayoutTemplate } from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import { getStroke } from 'perfect-freehand';

// Initialize PDF.js worker from unpkg CDN immediately after import
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
// ═══════════════════════════════════════════════════════════════════
// SECTION 1 — UTILITIES  (Import/Export, Search Engine, PDF Export)
// ═══════════════════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────
// AllUtils.js  –  Single merged utilities file
// Sections:
//   1. Import / Export helpers  (importExport.js)
//   2. Search Engine            (searchEngine.js)
//   3. PDF Export               (pdfExport.js)
// ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
// SECTION 1 — Import / Export Helpers
// ═══════════════════════════════════════════════════════════════

// Helper to trigger download
function triggerDownload(dataStr, fileName) {
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

// Exports the current annotations to a JSON file
export function exportAnnotationsToJson(annotations, fileName = 'comments.json') {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(annotations, null, 2));
    triggerDownload(dataStr, fileName);
}

// Exports the current annotations to a CSV file (Metadata Focus)
export function exportAnnotationsToCsv(annotations, fileName = 'comments.csv', options = {}) {
    const headers = [
        "Annotation ID", "Type", "Page Number", "Author", "Status", 
        "Creation Date", "Content/Value", "Replies Count"
    ];
    
    let csvContent = headers.join(",") + "\n";
    
    annotations.forEach(ann => {
        const id = ann.id;
        const type = ann.type || 'Unknown';
        const page = ann.pageNumber || 1;
        const author = ann.authorName || 'Unknown';
        const status = ann.resolved ? 'Resolved' : 'Unresolved';
        const date = ann.creationDate ? new Date(ann.creationDate).toLocaleString() : '';
        const content = `"${(ann.content || '').replace(/"/g, '""')}"`;
        const replies = ann.replies ? ann.replies.length : 0;
        
        csvContent += `${id},${type},${page},${author},${status},"${date}",${content},${replies}\n`;
    });
    
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    triggerDownload(dataStr, fileName);
}

// Exports the current annotations to a TXT file (Readable Format)
export function exportAnnotationsToTxt(annotations, fileName = 'comments.txt', options = {}) {
    let txtContent = "=== DOCUMENT ANNOTATION REPORT ===\n";
    txtContent += `Generated: ${new Date().toLocaleString()}\n`;
    txtContent += `Total Comments: ${annotations.length}\n\n`;
    
    annotations.forEach((ann, index) => {
        txtContent += `[${index + 1}] Type: ${ann.type.toUpperCase()} (Page ${ann.pageNumber || 1})\n`;
        if (options.includeMetadata) {
            txtContent += `    ID: ${ann.id}\n`;
            txtContent += `    Author: ${ann.authorName || 'Unknown'}\n`;
            txtContent += `    Date: ${ann.creationDate ? new Date(ann.creationDate).toLocaleString() : 'N/A'}\n`;
            txtContent += `    Status: ${ann.resolved ? 'Resolved' : 'Unresolved'}\n`;
        }
        if (ann.content) {
            txtContent += `    Content: ${ann.content}\n`;
        }
        
        if (options.includeReplies && ann.replies && ann.replies.length > 0) {
            txtContent += `    Replies (${ann.replies.length}):\n`;
            ann.replies.forEach((reply, rIdx) => {
                txtContent += `      > [${reply.authorName}] ${reply.content}\n`;
            });
        }
        txtContent += `\n`;
        txtContent += `--------------------------------------------------\n\n`;
    });
    
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(txtContent);
    triggerDownload(dataStr, fileName);
}

// Parses an uploaded JSON file and returns a Promise with the annotations array
export function parseImportFile(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            reject(new Error("No file provided"));
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target.result);
                if (!Array.isArray(json)) {
                    reject(new Error("Invalid file format. Expected a JSON array of annotations."));
                    return;
                }
                resolve(json);
            } catch (err) {
                reject(new Error("Failed to parse JSON file."));
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}
// ═══════════════════════════════════════════════════════════════
// SECTION 2 — Search Engine
// ═══════════════════════════════════════════════════════════════

/**
 * Enterprise Search Engine for Annotations
 * Supports:
 * - Exact Phrases: "fix this"
 * - Boolean Operators: AND, OR, NOT
 * - Wildcards: net*ork
 * - Field specific: type:rectangle
 */

function tokenize(query) {
    const tokens = [];
    let currentToken = '';
    let inQuotes = false;

    for (let i = 0; i < query.length; i++) {
        const char = query[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
            currentToken += char; // Keep quotes for parsing later
        } else if (char === ' ' && !inQuotes) {
            if (currentToken.trim() !== '') {
                tokens.push(currentToken.trim());
                currentToken = '';
            }
        } else {
            currentToken += char;
        }
    }
    
    if (currentToken.trim() !== '') {
        tokens.push(currentToken.trim());
    }
    
    return tokens;
}

function matchToken(annotation, token) {
    let isNegated = false;
    if (token.startsWith('NOT ')) {
        isNegated = true;
        token = token.substring(4).trim();
    } else if (token.startsWith('-')) {
        isNegated = true;
        token = token.substring(1).trim();
    }

    let field = null;
    let value = token;

    // Field targeting (e.g. type:rectangle)
    if (token.includes(':') && !token.startsWith('"')) {
        const parts = token.split(':');
        field = parts[0].toLowerCase();
        value = parts.slice(1).join(':').trim();
    }

    // Exact phrase handling
    let isExact = false;
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
        isExact = true;
        value = value.substring(1, value.length - 1).toLowerCase();
    } else {
        value = value.toLowerCase();
    }

    // Convert wildcards to regex if needed (only if not exact phrase)
    let regex = null;
    if (!isExact && value.includes('*')) {
        const escaped = value.replace(/[.+?^${}()|[\]\\]/g, '\\$&'); // Escape regex chars except *
        const regexStr = escaped.replace(/\*/g, '.*');
        try {
            regex = new RegExp(regexStr, 'i');
        } catch (e) {
            // fallback if invalid regex
        }
    }

    const checkMatch = (targetValue) => {
        if (!targetValue) return false;
        targetValue = targetValue.toString().toLowerCase();
        
        if (isExact) {
            return targetValue.includes(value);
        } else if (regex) {
            return regex.test(targetValue);
        } else {
            return targetValue.includes(value);
        }
    };

    let result = false;

    if (field) {
        if (field === 'type') result = checkMatch(annotation.type);
        else if (field === 'author') result = checkMatch(annotation.authorName);
        else if (field === 'status') {
            const statusStr = annotation.resolved ? 'resolved' : 'unresolved';
            result = checkMatch(statusStr);
        }
        else result = false; // unknown field
    } else {
        // Global search across text, author, and replies
        const matchesContent = checkMatch(annotation.text) || checkMatch(annotation.content);
        const matchesAuthor = checkMatch(annotation.authorName);
        const matchesReplies = annotation.replies && annotation.replies.some(r => checkMatch(r.content) || checkMatch(r.authorName));
        
        result = matchesContent || matchesAuthor || matchesReplies;
    }

    return isNegated ? !result : result;
}

export function evaluateSearchQuery(annotation, rawQuery) {
    if (!rawQuery || rawQuery.trim() === '') return true;

    // Pre-process standard boolean operators (convert " OR " into specific tokens or just handle simple evaluation)
    // For this lightweight version, we will default to AND for all tokens unless OR is explicitly used.
    
    // Quick normalization of operators
    const normalizedQuery = rawQuery
        .replace(/\s+AND\s+/g, ' ') // AND is implicit
        .replace(/\s+NOT\s+/g, ' -'); // Convert NOT to negation prefix
        
    const tokens = tokenize(normalizedQuery);
    
    // We will do a basic grouped evaluation.
    // If we see "OR", it splits the logic into groups.
    // e.g. [A, OR, B, C] -> Group 1 [A], Group 2 [B, C]. Result is Group 1 OR Group 2.
    
    const groups = [[]];
    for (const token of tokens) {
        if (token === 'OR' || token === 'or') {
            groups.push([]);
        } else {
            groups[groups.length - 1].push(token);
        }
    }

    // Evaluate each group (AND logic within group)
    const evaluateGroup = (group) => {
        if (group.length === 0) return false;
        for (const token of group) {
            if (!matchToken(annotation, token)) {
                return false;
            }
        }
        return true;
    };

    // If any group is true (OR logic), the annotation matches
    for (const group of groups) {
        if (evaluateGroup(group)) {
            return true;
        }
    }

    return false;
}
// ═══════════════════════════════════════════════════════════════
// SECTION 3 — PDF Export
// ═══════════════════════════════════════════════════════════════



// --- HELPERS ---

const unitToInches = {
  'pt': 1 / 72,
  'in': 1,
  'ft': 12,
  'yd': 36,
  'mi': 5280 * 12,
  'mm': 1 / 25.4,
  'cm': 1 / 2.54,
  'm': 100 / 2.54,
  'km': 100000 / 2.54,
};

const areaUnitToSqInches = {
  'ptÂ²': Math.pow(1 / 72, 2),
  'inÂ²': Math.pow(1, 2),
  'ftÂ²': Math.pow(12, 2),
  'ydÂ²': Math.pow(36, 2),
  'miÂ²': Math.pow(5280 * 12, 2),
  'mmÂ²': Math.pow(1 / 25.4, 2),
  'cmÂ²': Math.pow(1 / 2.54, 2),
  'mÂ²': Math.pow(100 / 2.54, 2),
  'kmÂ²': Math.pow(100000 / 2.54, 2),
  'acre': 43560 * Math.pow(12, 2),
  'hectare': 10000 * Math.pow(100 / 2.54, 2)
};

// From AreaTool.jsx
function hexToRgb(hex) {
  if (hex === 'transparent' || !hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

// From AreaTool.jsx
function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// From AreaTool.jsx
function calculatePolygonAreaPx(vertices) {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2);
}

// From AreaTool.jsx
function formatArea(areaPx, pixelsPerInch, unit, precision) {
  const sqInches = areaPx / (pixelsPerInch * pixelsPerInch);
  const realArea = sqInches / areaUnitToSqInches[unit];
  return `${realArea.toFixed(precision)} ${unit}`;
}

// From AreaTool.jsx
function getCentroid(vertices) {
  if (!vertices || vertices.length === 0) return {x: 0, y: 0};
  let x = 0, y = 0;
  for (let v of vertices) {
    x += v.x;
    y += v.y;
  }
  return {x: x / vertices.length, y: y / vertices.length};
}

// From ArrowTool.jsx
function getArrowHeadPoints(startX, startY, endX, endY, width) {
  const headLength = width * 3 + 8;
  const angle = Math.atan2(endY - startY, endX - startX);
  const p1 = { x: endX, y: endY };
  const p2 = {
    x: endX - headLength * Math.cos(angle - Math.PI / 6),
    y: endY - headLength * Math.sin(angle - Math.PI / 6)
  };
  const p3 = {
    x: endX - headLength * Math.cos(angle + Math.PI / 6),
    y: endY - headLength * Math.sin(angle + Math.PI / 6)
  };

  const dist = Math.hypot(endX - startX, endY - startY);
  const shortenDist = Math.min(headLength * 0.85, dist);
  const shaftEndX = endX - shortenDist * Math.cos(angle);
  const shaftEndY = endY - shortenDist * Math.sin(angle);

  return { p1, p2, p3, shaftEndX, shaftEndY };
}

// From CalloutTool.jsx
function getCalloutArrowPoints(startX, startY, endX, endY, width) {
  const headLength = width * 3 + 8;
  const angle = Math.atan2(startY - endY, startX - endX);
  const p1 = { x: startX, y: startY };
  const p2 = {
    x: startX - headLength * Math.cos(angle - Math.PI / 6),
    y: startY - headLength * Math.sin(angle - Math.PI / 6)
  };
  const p3 = {
    x: startX - headLength * Math.cos(angle + Math.PI / 6),
    y: startY - headLength * Math.sin(angle + Math.PI / 6)
  };

  const dist = Math.hypot(endX - startX, endY - startY);
  const shortenDist = Math.min(headLength * 0.85, dist);
  const shaftStartX = startX - shortenDist * Math.cos(angle);
  const shaftStartY = startY - shortenDist * Math.sin(angle);

  return { p1, p2, p3, shaftStartX, shaftStartY };
}

// From CloudTool.jsx
function generateCloudPath(vertices, previewCoord = null, radius = 20) {
    if (!vertices || vertices.length === 0) return '';
    
    let path = `M ${vertices[0].x},${vertices[0].y} `;
    
    const pts = [...vertices];
    if (previewCoord) {
        pts.push(previewCoord);
        // Also draw the closing line in preview to show what the final shape looks like
        if (pts.length > 2) {
            pts.push(vertices[0]);
        }
    }
    
    const len = pts.length;
    // If not previewing and we have > 2 points, we close it
    const shouldClose = !previewCoord && vertices.length > 2;
    const segments = previewCoord ? len - 1 : (shouldClose ? len : len - 1);
    
    if (segments <= 0) return path;

    for (let i = 0; i < segments; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % len];
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 1) continue;

        const numArcs = Math.max(1, Math.round(dist / (radius * 2)));
        const stepX = dx / numArcs;
        const stepY = dy / numArcs;
        
        let currX = p1.x;
        let currY = p1.y;
        
        for (let j = 0; j < numArcs; j++) {
            const nextX = currX + stepX;
            const nextY = currY + stepY;
            
            const r = (Math.sqrt(stepX * stepX + stepY * stepY) / 2) * 1.3;
            // Sweep flag = 1 means clockwise arc
            path += `A ${r},${r} 0 0,1 ${nextX},${nextY} `;
            
            currX = nextX;
            currY = nextY;
        }
    }
    
    if (shouldClose) path += " Z";
    
    return path;
}

// From DistanceTool.jsx
function calculateTotalDistancePx(vertices) {
  if (!vertices || vertices.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < vertices.length; i++) {
    dist += calculateDistance(vertices[i-1].x, vertices[i-1].y, vertices[i].x, vertices[i].y);
  }
  return dist;
}

// From DistanceTool.jsx
function formatMeasurement(distancePx, pixelsPerInch, unit, precision) {
  const inches = distancePx / pixelsPerInch;
  const realDistance = inches / unitToInches[unit];
  return `${realDistance.toFixed(precision)} ${unit}`;
}

// From InkTool.jsx
function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q']
  );
  d.push('Z');
  return d.join(' ');
}

// From InkTool.jsx
const PEN_PROFILES = {
  ballpoint: { name: 'Ball Pen', thinning: 0.1, smoothing: 0.5, streamline: 0.5, simulatePressure: true },
  fountain: { name: 'Fountain Pen', thinning: 0.7, smoothing: 0.8, streamline: 0.8, simulatePressure: true },
  marker: { name: 'Marker', thinning: -0.1, smoothing: 0.3, streamline: 0.5, simulatePressure: false },
  brush: { name: 'Brush Pen', thinning: 0.9, smoothing: 0.9, streamline: 0.9, simulatePressure: true, taperStart: 5, taperEnd: 5 },
};


// From SquigglyTool.jsx
function getSquigglyPath(x, y, w, style) {
  let amplitude = 2;
  let frequency = 3;
  
  if (style === 'small') { amplitude = 1.5; frequency = 2; }
  if (style === 'large') { amplitude = 3; frequency = 5; }
  
  if (style === 'zigzag') {
    let d = `M ${x},${y} `;
    for (let i = 0; i < w; i += frequency * 2) {
      d += `L ${x + i + frequency},${y + amplitude} L ${x + i + frequency * 2},${y - amplitude} `;
    }
    return d;
  }

  // Standard wave using Q (Quadratic Bezier)
  let d = `M ${x},${y} `;
  for (let i = 0; i < w; i += frequency * 2) {
    d += `Q ${x + i + frequency/2},${y + amplitude} ${x + i + frequency},${y} `;
    d += `Q ${x + i + frequency*1.5},${y - amplitude} ${x + i + frequency*2},${y} `;
  }
  return d;
}




// From StickyNoteTool.jsx
const ICON_SVG_PATHS = {
  'Note': 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  'Comment': 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z',
  'Help': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01',
  'Key': 'M21 2l-2 2 M21 6l-2-2 M15.5 7.5l2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4 M15.5 7.5L9.61 13.39a5.5 5.5 0 1 0 7.78-7.78z',
  'Check': 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
  'Cross': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M15 9l-6 6 M9 9l6 6',
  'Star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'Info': 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 16v-4 M12 8h.01',
};



// --- EXPORT FUNCTION ---
export async function downloadAnnotationsPdf(file, annotations, pixelsPerInch = 72) {
    if (!file) return;
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        
        // Embed necessary fonts (StandardFonts are built-in)
        let helveticaFont;
        try {
             helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        } catch (e) {
             helveticaFont = await pdfDoc.embedFont('Helvetica');
        }
        
        let helveticaBoldFont;
        try {
            helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        } catch (e) {
            helveticaBoldFont = await pdfDoc.embedFont('Helvetica-Bold');
        }
        
        const pages = pdfDoc.getPages();

        annotations.filter(a => a.visibility).forEach(ann => {
            const pageIndex = ann.pageNumber - 1;
            if (pageIndex >= 0 && pageIndex < pages.length) {
                const page = pages[pageIndex];
                const pageHeight = page.getHeight();
                let r = 0, g = 0, b = 0;
                let stroke = hexToRgb(ann.color || ann.strokeColor);
                if (stroke) { r = stroke.r; g = stroke.g; b = stroke.b; }

                
                // Switch on annotation type
if (ann.type === 'area' && ann.vertices && ann.vertices.length > 2) {
            const pageHeight = page.getHeight();
            const svgPath = ann.vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z';
            
            const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
            const fillRgb = hexToRgb(ann.fillColor);
            
            const options = {
                x: 0,
                y: pageHeight,
                borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                borderWidth: ann.borderWidth,
                borderOpacity: ann.opacity,
            };
            
            if (fillRgb) {
                options.color = rgb(fillRgb.r, fillRgb.g, fillRgb.b);
                options.opacity = ann.opacity;
            }
            
            page.drawSvgPath(svgPath, options);

            // Draw Area Label
            const centroid = getCentroid(ann.vertices);
            const areaPx = calculatePolygonAreaPx(ann.vertices);
            const labelText = formatArea(areaPx, pixelsPerInch, ann.unit, ann.precision);
            const textSize = 14;
            const textWidth = helveticaFont.widthOfTextAtSize(labelText, textSize);
            
            page.drawText(labelText, {
                x: centroid.x - textWidth / 2,
                y: pageHeight - centroid.y - (textSize / 2),
                size: textSize,
                font: helveticaFont,
                color: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
            });
          }

if (ann.type === 'arrow') {
            const { p1, p2, p3, shaftEndX, shaftEndY } = getArrowHeadPoints(ann.startX, ann.startY, ann.endX, ann.endY, ann.width);
            
            // Draw shaft
            page.drawLine({
              start: { x: ann.startX, y: page.getHeight() - ann.startY },
              end: { x: shaftEndX, y: page.getHeight() - shaftEndY },
              thickness: ann.width,
              color: rgb(r, g, b),
              opacity: ann.opacity
            });
            
            // Draw arrowhead
            const svgPath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;
            page.drawSvgPath(svgPath, {
              x: 0, y: page.getHeight(), color: rgb(r, g, b), opacity: ann.opacity,
            });
          }

if (ann.type === 'callout') {
            const { p1, p2, p3, shaftStartX, shaftStartY } = getCalloutArrowPoints(ann.startX, ann.startY, ann.endX, ann.endY, ann.width);
            
            // Draw shaft
            page.drawLine({
              start: { x: shaftStartX, y: page.getHeight() - shaftStartY },
              end: { x: ann.endX, y: page.getHeight() - ann.endY },
              thickness: ann.width,
              color: rgb(r, g, b),
              opacity: ann.opacity
            });

            // Draw arrowhead using a custom SVG path
            // In pdf-lib y-axis is inverted
            const arrowSvg = `M ${p1.x},${page.getHeight() - p1.y} L ${p2.x},${page.getHeight() - p2.y} L ${p3.x},${page.getHeight() - p3.y} Z`;
            page.drawSvgPath(arrowSvg, {
              x: 0, y: 0,
              color: rgb(r, g, b),
              opacity: ann.opacity
            });

            // Box dimensions
            const fontSize = 16 + ann.width;
            const textPadding = 12;
            const approxTextWidth = (ann.text.length * fontSize * 0.6) + textPadding * 2;
            const boxWidth = Math.max(80, approxTextWidth);
            const boxHeight = fontSize + textPadding * 2;
            
            let boxX = ann.endX;
            let boxY = ann.endY - boxHeight / 2;
            if (ann.startX > ann.endX) {
              boxX = ann.endX - boxWidth;
            }

            // Draw Box
            // pdf-lib drawRectangle expects y to be the bottom-left corner
            const rectYPdf = page.getHeight() - boxY - boxHeight;
            page.drawRectangle({
              x: boxX,
              y: rectYPdf,
              width: boxWidth,
              height: boxHeight,
              color: rgb(1, 1, 1), // white background
              borderColor: rgb(r, g, b),
              borderWidth: ann.width,
              opacity: ann.opacity,
              borderOpacity: ann.opacity
            });

            // Draw text
            const textWidthPdf = helveticaFont.widthOfTextAtSize(ann.text, fontSize);
            const textHeightPdf = helveticaFont.heightAtSize(fontSize);
            
            const textX = boxX + boxWidth / 2 - textWidthPdf / 2;
            const textY = rectYPdf + boxHeight / 2 - textHeightPdf / 2 + (fontSize * 0.23); // Visual tweak for baseline alignment
            
            page.drawText(ann.text, {
              x: textX,
              y: textY,
              size: fontSize,
              font: helveticaFont,
              color: rgb(r, g, b),
              opacity: ann.opacity
            });
          }

if (ann.type === 'cloud') {
            const pageHeight = page.getHeight();
            if (ann.vertices && ann.vertices.length > 2) {
               const svgPath = generateCloudPath(ann.vertices, null, ann.cloudRadius);
               
               const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
               const fillRgb = hexToRgb(ann.fillColor);
               
               const options = {
                 x: 0,
                 y: pageHeight,
                 borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                 borderWidth: ann.borderWidth,
                 borderOpacity: ann.opacity,
               };
               
               if (fillRgb) {
                 options.color = rgb(fillRgb.r, fillRgb.g, fillRgb.b);
                 options.opacity = ann.opacity;
               }
               
               page.drawSvgPath(svgPath, options);
            }
          }

if (ann.type === 'distance' && ann.vertices && ann.vertices.length > 1) {
            const pageHeight = page.getHeight();
            const svgPath = ann.vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ');
            
            const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
            const colorRgb = rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b);
            
            page.drawSvgPath(svgPath, {
                x: 0,
                y: pageHeight,
                borderColor: colorRgb,
                borderWidth: ann.borderWidth,
            });

            // Draw vertex markers
            ann.vertices.forEach((v) => {
              page.drawCircle({
                x: v.x,
                y: pageHeight - v.y,
                size: ann.borderWidth * 1.5,
                color: colorRgb
              });
            });

            // Draw Distance Label
            const lastVertex = ann.vertices[ann.vertices.length - 1];
            const totalPx = calculateTotalDistancePx(ann.vertices);
            const labelText = formatMeasurement(totalPx, pixelsPerInch, ann.unit, ann.precision);
            const textSize = 12;
            const textWidth = helveticaFont.widthOfTextAtSize(labelText, textSize);
            
            page.drawText(labelText, {
                x: lastVertex.x - textWidth / 2,
                y: pageHeight - lastVertex.y - 20,
                size: textSize,
                font: helveticaFont,
                color: colorRgb,
            });
          }

if (ann.type === 'ellipse') {
            const rx = ann.w / 2;
            const ry = ann.h / 2;
            const cx = ann.x + rx;
            const cyPdf = page.getHeight() - (ann.y + ry);

            const hasFill = ann.bgColor && ann.bgColor !== 'transparent';
            const hasBorder = ann.strokeColor && ann.strokeColor !== 'transparent' && ann.borderWidth > 0;

            const drawParams = {
              x: cx,
              y: cyPdf,
              xScale: rx,
              yScale: ry,
              opacity: ann.opacity
            };

            if (hasFill) {
              const bg = hexToRgb(ann.bgColor);
              drawParams.color = rgb(bg.r, bg.g, bg.b);
            } else {
              drawParams.color = undefined;
            }

            if (hasBorder) {
              const border = hexToRgb(ann.strokeColor);
              drawParams.borderColor = rgb(border.r, border.g, border.b);
              drawParams.borderWidth = ann.borderWidth;
              drawParams.borderOpacity = ann.opacity;
            } else {
              drawParams.borderWidth = 0;
            }

            page.drawEllipse(drawParams);
          }

if (ann.type === 'freetext') {
            const rectYPdf = page.getHeight() - (ann.y + ann.h);

            // Draw Text natively without backgrounds or borders
            if (ann.text) {
              const textRgb = hexToRgb(ann.textColor);
              if (textRgb) {
                const padding = 4;
                page.drawText(ann.text, {
                  x: ann.x + padding,
                  y: rectYPdf + ann.h - padding - ann.fontSize, 
                  size: ann.fontSize,
                  font: helveticaFont,
                  color: rgb(textRgb.r, textRgb.g, textRgb.b),
                  maxWidth: ann.w - (padding * 2),
                  lineHeight: ann.fontSize * 1.2,
                  opacity: ann.opacity
                });
              }
            }
          }

if (ann.type === 'highlight') {
            ann.rects.forEach(rect => {
              // pdf-lib drawRectangle expects y to be the bottom-left corner
              // rect.y is top-left in SVG. So bottom-left is rect.y + rect.h
              const rectYPdf = page.getHeight() - (rect.y + rect.h);
              
              page.drawRectangle({
                x: rect.x,
                y: rectYPdf,
                width: rect.w,
                height: rect.h,
                color: rgb(r, g, b),
                opacity: ann.opacity
              });
            });
          }

if (ann.type === 'ink') {
            const profile = PEN_PROFILES[ann.penStyle] || PEN_PROFILES['ballpoint'];
            const strokeData = getStroke(ann.points, {
              ...profile,
              size: ann.width * (ann.penStyle === 'marker' ? 2 : 1),
            });
            const pathData = getSvgPathFromStroke(strokeData);
            
            let actualOpacity = ann.opacity;
            if (ann.penStyle === 'marker') {
              actualOpacity = Math.min(ann.opacity, 0.6);
            }

            // In pdf-lib y-axis is inverted
            page.drawSvgPath(pathData, {
              x: 0, 
              y: page.getHeight(),
              color: rgb(r, g, b),
              opacity: actualOpacity
            });
          }

if (ann.type === 'line') {
            const y1Pdf = page.getHeight() - ann.startY;
            const y2Pdf = page.getHeight() - ann.endY;

            const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};

            page.drawLine({
              start: { x: ann.startX, y: y1Pdf },
              end: { x: ann.endX, y: y2Pdf },
              thickness: ann.borderWidth,
              color: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
              opacity: ann.opacity,
            });
          }

if (ann.type === 'measurement') {
            const y1Pdf = page.getHeight() - ann.startY;
            const y2Pdf = page.getHeight() - ann.endY;

            const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
            const colorRgb = rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b);

            // Draw line segment
            page.drawLine({
              start: { x: ann.startX, y: y1Pdf },
              end: { x: ann.endX, y: y2Pdf },
              thickness: ann.borderWidth,
              color: colorRgb,
            });

            // Calculate text label
            const distPx = calculateDistance(ann.startX, ann.startY, ann.endX, ann.endY);
            const labelText = formatMeasurement(distPx, pixelsPerInch, ann.unit, ann.precision);
            const textSize = 12;
            const textWidth = helveticaFont.widthOfTextAtSize(labelText, textSize);
            
            // Calculate label position and angle
            const cx = (ann.startX + ann.endX) / 2;
            const cy = (y1Pdf + y2Pdf) / 2;
            let angle = Math.atan2(y2Pdf - y1Pdf, ann.endX - ann.startX) * (180 / Math.PI);
            
            if (angle > 90) angle -= 180;
            else if (angle < -90) angle += 180;
            
            // Draw text
            page.drawText(labelText, {
                x: cx - textWidth / 2,
                y: cy + 4,
                size: textSize,
                font: helveticaFont,
                color: colorRgb,
                rotate: { type: 'degrees', angle: angle }
            });
            
            // Draw markers (simple circles at ends as a fallback for arrows in PDF export)
            page.drawCircle({ x: ann.startX, y: y1Pdf, size: ann.borderWidth * 2, color: colorRgb });
            page.drawCircle({ x: ann.endX, y: y2Pdf, size: ann.borderWidth * 2, color: colorRgb });
          }

if (ann.type === 'polygon') {
            const pageHeight = page.getHeight();
            if (ann.vertices && ann.vertices.length > 2) {
               const svgPath = ann.vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z';
               
               const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
               const fillRgb = hexToRgb(ann.fillColor);
               
               const options = {
                 x: 0,
                 y: pageHeight,
                 borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                 borderWidth: ann.borderWidth,
                 borderOpacity: ann.opacity,
               };
               
               if (fillRgb) {
                 options.color = rgb(fillRgb.r, fillRgb.g, fillRgb.b);
                 options.opacity = ann.opacity;
               }
               
               page.drawSvgPath(svgPath, options);
            }
          }

if (ann.type === 'polyline') {
            const pageHeight = page.getHeight();
            // This assumes ann.vertices exist
            if (ann.vertices && ann.vertices.length > 0) {
               const svgPath = ann.vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ');
               
               const strokeRgb = hexToRgb(ann.strokeColor) || {r:0, g:0, b:0};
               
               // PDF-lib supports drawing paths
               page.drawSvgPath(svgPath, {
                 x: 0,
                 y: pageHeight,
                 borderColor: rgb(strokeRgb.r, strokeRgb.g, strokeRgb.b),
                 borderWidth: ann.borderWidth,
                 borderOpacity: ann.opacity,
               });
            }
          }

if (ann.type === 'rectangle') {
            const rectYPdf = page.getHeight() - (ann.y + ann.h);

            const hasFill = ann.bgColor && ann.bgColor !== 'transparent';
            const hasBorder = ann.strokeColor && ann.strokeColor !== 'transparent' && ann.borderWidth > 0;

            const drawParams = {
              x: ann.x,
              y: rectYPdf,
              width: ann.w,
              height: ann.h,
              opacity: ann.opacity
            };

            if (hasFill) {
              const bg = hexToRgb(ann.bgColor);
              drawParams.color = rgb(bg.r, bg.g, bg.b);
            } else {
              drawParams.color = undefined;
            }

            if (hasBorder) {
              const border = hexToRgb(ann.strokeColor);
              drawParams.borderColor = rgb(border.r, border.g, border.b);
              drawParams.borderWidth = ann.borderWidth;
              drawParams.borderOpacity = ann.opacity;
            } else {
              drawParams.borderWidth = 0;
            }

            page.drawRectangle(drawParams);
          }

if (ann.type === 'squiggly') {
            ann.rects.forEach(rect => {
              // Get path in standard SVG coordinates (Y goes down)
              const lineY = rect.y + rect.h + 3;
              const pathData = getSquigglyPath(rect.x, lineY, rect.w, ann.waveStyle);
              
              // drawSvgPath automatically inverts Y (Y -> -Y). 
              // By setting y: page.getHeight(), we move the origin from bottom-left to top-left.
              page.drawSvgPath(pathData, {
                x: 0,
                y: page.getHeight(),
                borderColor: rgb(r, g, b),
                borderWidth: ann.width,
                borderOpacity: ann.opacity,
                color: rgb(1, 1, 1),
                opacity: 0 // Ensure the wave path has no visible fill
              });
            });
          }

if (ann.type === 'stamp') {
            const rot = ann.rotation || 0;
            const rad = -rot * Math.PI / 180; // PDF rotation is CCW
            const cx = ann.x;
            const cy = page.getHeight() - ann.y;

            // Rotate relative bottom-left point for the rectangle
            const dx = -ann.width / 2;
            const dy = -ann.height / 2;
            const rectX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
            const rectY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));

            page.drawRectangle({
              x: rectX,
              y: rectY,
              width: ann.width,
              height: ann.height,
              rotate: degrees(-rot),
              borderColor: rgb(r, g, b),
              borderWidth: 8,
              opacity: ann.opacity,
              borderOpacity: ann.opacity
            });

            // Draw text
            const fontSize = ann.width * 0.168;
            const textWidth = helveticaFont.widthOfTextAtSize(ann.text, fontSize);
            const textHeight = helveticaFont.heightAtSize(fontSize);
            
            const tdx = -textWidth / 2;
            const tdy = -textHeight / 2 + (fontSize * 0.23);
            const textX = cx + (tdx * Math.cos(rad) - tdy * Math.sin(rad));
            const textY = cy + (tdx * Math.sin(rad) + tdy * Math.cos(rad));
            
            page.drawText(ann.text, {
              x: textX,
              y: textY,
              size: fontSize,
              font: helveticaFont,
              color: rgb(r, g, b),
              rotate: degrees(-rot),
              opacity: ann.opacity
            });
          }

if (ann.type === 'sticky') {
            const size = 24;
            
            // Draw a white background box for the icon to hide underlying text
            page.drawRectangle({
              x: ann.x - size/2,
              y: page.getHeight() - (ann.y + size/2),
              width: size,
              height: size,
              color: rgb(1, 1, 1),
              opacity: ann.opacity
            });
            
            // Draw the actual SVG icon path
            const pathData = ICON_SVG_PATHS[ann.iconType] || ICON_SVG_PATHS['Note'];
            page.drawSvgPath(pathData, {
              x: ann.x - size/2,
              y: page.getHeight() - (ann.y - size/2),
              borderColor: rgb(r, g, b),
              borderWidth: 2,
              color: rgb(1, 1, 1),
              opacity: 0, // no fill
              borderOpacity: ann.opacity
            });
            
            if (ann.text) {
              const lines = ann.text.split('\n');
              let maxLen = 0;
              lines.forEach(l => { if (l.length > maxLen) maxLen = l.length; });
              
              const boxWidth = Math.max(120, maxLen * 6 + 20);
              const boxHeight = Math.max(40, lines.length * 14 + 20);
              const textMargin = 16;
              const textX = ann.x + size/2 + textMargin;
              const textY = page.getHeight() - (ann.y - size/2); // align top with icon
              
              // Draw a solid background box with a colored border for the text
              page.drawRectangle({
                x: textX,
                y: textY - boxHeight, // bottom left
                width: boxWidth,
                height: boxHeight,
                color: rgb(1, 1, 1),
                borderColor: rgb(r, g, b),
                borderWidth: 1,
                opacity: ann.opacity,
                borderOpacity: ann.opacity
              });
              
              // Draw the text inside the box
              lines.forEach((line, i) => {
                page.drawText(line, {
                  x: textX + 10,
                  y: textY - 20 - (i * 14),
                  size: 10,
                  font: helveticaFont,
                  color: rgb(0, 0, 0),
                  opacity: ann.opacity
                });
              });
            }
          }

if (ann.type === 'strikeout') {
            ann.rects.forEach(rect => {
              // pdf-lib drawRectangle expects y to be the bottom-left corner
              // rect.y is top-left in SVG. So bottom-left is rect.y + rect.h
              // For strikeout, the line is at rect.y + rect.h / 2
              const rectYPdf = page.getHeight() - (rect.y + rect.h / 2);
              
              if (ann.strikeoutStyle === 'double') {
                page.drawLine({
                  start: { x: rect.x, y: rectYPdf + Math.max(2, ann.width) },
                  end: { x: rect.x + rect.w, y: rectYPdf + Math.max(2, ann.width) },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity
                });
                page.drawLine({
                  start: { x: rect.x, y: rectYPdf - Math.max(2, ann.width) },
                  end: { x: rect.x + rect.w, y: rectYPdf - Math.max(2, ann.width) },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity
                });
              } else {
                let dashArray = undefined;
                if (ann.strikeoutStyle === 'dashed') dashArray = [6, 4];
                if (ann.strikeoutStyle === 'dotted') dashArray = [2, 4];

                page.drawLine({
                  start: { x: rect.x, y: rectYPdf },
                  end: { x: rect.x + rect.w, y: rectYPdf },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity,
                  dashArray
                });
              }
            });
          }

if (ann.type === 'textbox') {
            // pdf-lib expects bottom-left for rects
            const rectYPdf = page.getHeight() - (ann.y + ann.h);

            // Draw Background Fill
            if (ann.bgColor !== 'transparent') {
              const bgRgb = hexToRgb(ann.bgColor);
              if (bgRgb) {
                page.drawRectangle({
                  x: ann.x,
                  y: rectYPdf,
                  width: ann.w,
                  height: ann.h,
                  color: rgb(bgRgb.r, bgRgb.g, bgRgb.b),
                  opacity: ann.opacity
                });
              }
            }

            // Draw Border
            if (ann.borderWidth > 0) {
              const borderRgb = hexToRgb(ann.borderColor);
              if (borderRgb) {
                page.drawRectangle({
                  x: ann.x,
                  y: rectYPdf,
                  width: ann.w,
                  height: ann.h,
                  borderColor: rgb(borderRgb.r, borderRgb.g, borderRgb.b),
                  borderWidth: ann.borderWidth,
                  color: undefined, // no fill
                  opacity: 0,
                  borderOpacity: ann.opacity
                });
              }
            }

            // Draw Text
            if (ann.text) {
              const textRgb = hexToRgb(ann.textColor);
              if (textRgb) {
                const padding = 8;
                // pdf-lib drawText with maxWidth breaks lines automatically
                page.drawText(ann.text, {
                  x: ann.x + padding,
                  y: rectYPdf + ann.h - padding - ann.fontSize, // start near top
                  size: ann.fontSize,
                  font: helveticaFont,
                  color: rgb(textRgb.r, textRgb.g, textRgb.b),
                  maxWidth: ann.w - (padding * 2),
                  lineHeight: ann.fontSize * 1.2,
                  opacity: ann.opacity
                });
              }
            }
          }

if (ann.type === 'underline') {
            ann.rects.forEach(rect => {
              // pdf-lib drawRectangle expects y to be the bottom-left corner
              // rect.y is top-left in SVG. So bottom-left is rect.y + rect.h
              // We added +2 visual padding
              const rectYPdf = page.getHeight() - (rect.y + rect.h + 2);
              
              if (ann.underlineStyle === 'double') {
                page.drawLine({
                  start: { x: rect.x, y: rectYPdf },
                  end: { x: rect.x + rect.w, y: rectYPdf },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity
                });
                page.drawLine({
                  start: { x: rect.x, y: rectYPdf - ann.width * 2 },
                  end: { x: rect.x + rect.w, y: rectYPdf - ann.width * 2 },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity
                });
              } else {
                let dashArray = undefined;
                if (ann.underlineStyle === 'dashed') dashArray = [6, 4];
                if (ann.underlineStyle === 'dotted') dashArray = [2, 4];

                page.drawLine({
                  start: { x: rect.x, y: rectYPdf },
                  end: { x: rect.x + rect.w, y: rectYPdf },
                  thickness: ann.width,
                  color: rgb(r, g, b),
                  opacity: ann.opacity,
                  dashArray
                });
              }
            });
          }

          if (ann.type === 'pencil' || ann.type === 'ink') {
              const strokeOptions = {
                size: ann.width || 8, thinning: 0.5, smoothing: 0.5, streamline: 0.5,
                simulatePressure: ann.points && ann.points[0] && ann.points[0].length === 2,
              };
              const strokePoints = getStroke(ann.points, strokeOptions);
              const svgPath = getSvgPathFromStroke(strokePoints);
              page.drawSvgPath(svgPath, {
                x: 0,
                y: pageHeight,
                color: rgb(r, g, b),
                opacity: ann.opacity
              });
          }
            }
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `annotated_${file.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error downloading PDF:", error);
    }
}

// ═══════════════════════════════════════════════════════════════════
// SECTION 2 — CONTEXTS  (HistoryContext, AnnotationContext, ReviewContext)
// ═══════════════════════════════════════════════════════════════════
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 1 â€” CONTEXTS  (HistoryContext, AnnotationContext, ReviewContext)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// HistoryContext
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const HistoryContext = createContext();

export function HistoryProvider({ children }) {
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);

  const addHistoryLog = useCallback((actionType, annotationId, details = {}) => {
    const newLog = {
      id: uuidv4(),
      annotationId,
      documentId: 'current-doc',
      actionType,
      authorName: 'Current User',
      timestamp: new Date().toISOString(),
      details
    };
    setHistoryLogs(prev => [newLog, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistoryLogs([]);
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        historyLogs,
        addHistoryLog,
        clearHistory,
        isHistoryPanelOpen,
        setIsHistoryPanelOpen
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AnnotationContext  (depends on HistoryContext)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const AnnotationContext = createContext();

export function AnnotationProvider({ children }) {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [history, setHistory] = useState([]);
  const [redoHistory, setRedoHistory] = useState([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState(null);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);
  const { addHistoryLog } = useContext(HistoryContext);

  const addAnnotation = useCallback((newAnnotation) => {
    setAnnotations((prev) => {
      const nextState = [...prev, newAnnotation];
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('CREATED', newAnnotation.id, {
      type: newAnnotation.type,
      pageNumber: newAnnotation.pageNumber
    });
  }, [addHistoryLog]);

  const updateAnnotation = useCallback((id, updates) => {
    setAnnotations((prev) => {
      const nextState = prev.map((ann) =>
        ann.id === id ? { ...ann, ...updates, lastModifiedDate: new Date().toISOString() } : ann
      );
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    let actionType = 'EDITED';
    if (updates.resolved !== undefined) {
      actionType = updates.resolved ? 'RESOLVED' : 'REOPENED';
    }
    addHistoryLog(actionType, id, { updatedFields: Object.keys(updates) });
  }, [addHistoryLog]);

  const deleteAnnotation = useCallback((id) => {
    setAnnotations((prev) => {
      const nextState = prev.filter((ann) => ann.id !== id);
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      if (selectedAnnotationId === id) setSelectedAnnotationId(null);
      return nextState;
    });
    addHistoryLog('DELETED', id);
  }, [selectedAnnotationId, addHistoryLog]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory((h) => h.slice(0, h.length - 1));
    setRedoHistory((rh) => [annotations, ...rh]);
    setAnnotations(previousState);
  }, [history, annotations]);

  const redo = useCallback(() => {
    if (redoHistory.length === 0) return;
    const nextState = redoHistory[0];
    setRedoHistory((rh) => rh.slice(1));
    setHistory((h) => [...h, annotations]);
    setAnnotations(nextState);
  }, [redoHistory, annotations]);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setHistory([]);
    setRedoHistory([]);
    setSelectedAnnotationId(null);
  }, []);

  const importAnnotations = useCallback((importedAnnotations, mode = 'MERGE') => {
    setAnnotations(prev => {
      let nextState;
      if (mode === 'REPLACE') {
        nextState = [...importedAnnotations];
      } else {
        const existingIds = new Set(prev.map(a => a.id));
        const newAnnotations = importedAnnotations.filter(a => !existingIds.has(a.id));
        nextState = [...prev, ...newAnnotations];
      }
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('IMPORTED', 'multiple', { mode });
  }, [addHistoryLog]);

  const addReply = useCallback((annotationId, replyContent) => {
    const newReply = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: replyContent,
      authorName: 'Reviewer',
      createdDate: new Date().toISOString()
    };
    setAnnotations(prev => {
      const nextState = prev.map(ann => {
        if (ann.id === annotationId) {
          return {
            ...ann,
            replies: [...(ann.replies || []), newReply],
            lastModifiedDate: new Date().toISOString()
          };
        }
        return ann;
      });
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('REPLIED', annotationId, { replyId: newReply.id });
  }, [addHistoryLog]);

  const deleteReply = useCallback((annotationId, replyId) => {
    setAnnotations(prev => {
      const nextState = prev.map(ann => {
        if (ann.id === annotationId && ann.replies) {
          return {
            ...ann,
            replies: ann.replies.filter(r => r.id !== replyId),
            lastModifiedDate: new Date().toISOString()
          };
        }
        return ann;
      });
      setHistory((h) => [...h, prev]);
      setRedoHistory([]);
      return nextState;
    });
    addHistoryLog('DELETED', annotationId, { replyId, type: 'reply' });
  }, [addHistoryLog]);

  return (
    <AnnotationContext.Provider
      value={{
        file, setFile,
        numPages, setNumPages,
        annotations, setAnnotations,
        selectedAnnotationId, setSelectedAnnotationId,
        addAnnotation, updateAnnotation, deleteAnnotation,
        undo, redo, canUndo: history.length > 0, canRedo: redoHistory.length > 0,
        clearAnnotations, importAnnotations,
        addReply, deleteReply,
        isCommentPanelOpen, setIsCommentPanelOpen,
        isPropertiesPanelOpen, setIsPropertiesPanelOpen
      }}
    >
      {children}
    </AnnotationContext.Provider>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ReviewContext  (depends on AnnotationContext)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ReviewContext = createContext();

export function ReviewProvider({ children }) {
  const { annotations } = useContext(AnnotationContext);

  const [reviewId] = useState('REV-10492-X');
  const [reviewName, setReviewName] = useState('Q3 Architectural Floorplan Review');
  const [reviewType, setReviewType] = useState('Engineering Review');
  const [reviewStage, setReviewStage] = useState('Technical Validation');
  const [reviewStatus, setReviewStatus] = useState('In Review');
  const [priorityLevel, setPriorityLevel] = useState('High');
  const [department, setDepartment] = useState('Structural Engineering');
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);

  const [reviewers, setReviewers] = useState([
    { id: 1, name: 'Alice Chen', role: 'Lead Architect', avatar: 'https://i.pravatar.cc/150?u=alice', status: 'Approved' },
    { id: 2, name: 'Bob Smith', role: 'Structural Engineer', avatar: 'https://i.pravatar.cc/150?u=bob', status: 'Pending' },
    { id: 3, name: 'Charlie Davis', role: 'MEP Consultant', avatar: 'https://i.pravatar.cc/150?u=charlie', status: 'Rejected' },
  ]);

  const [metrics, setMetrics] = useState({
    totalAnnotations: 0,
    openComments: 0,
    resolvedComments: 0,
    completionPercentage: 0,
  });

  useEffect(() => {
    if (!annotations) return;
    const total = annotations.length;
    const resolved = annotations.filter(a => a.resolved).length;
    const open = total - resolved;
    const completion = total === 0 ? 0 : Math.round((resolved / total) * 100);
    setMetrics({ totalAnnotations: total, openComments: open, resolvedComments: resolved, completionPercentage: completion });
  }, [annotations]);

  const updateReviewStatus = (newStatus) => setReviewStatus(newStatus);
  const assignReviewer = (reviewer) => setReviewers(prev => [...prev, reviewer]);
  const removeReviewer = (id) => setReviewers(prev => prev.filter(r => r.id !== id));

  return (
    <ReviewContext.Provider
      value={{
        reviewId, reviewName, setReviewName,
        reviewType, setReviewType,
        reviewStage, setReviewStage,
        reviewStatus, setReviewStatus: updateReviewStatus,
        priorityLevel, setPriorityLevel,
        department, setDepartment,
        reviewers, assignReviewer, removeReviewer,
        metrics,
        isReviewPanelOpen, setIsReviewPanelOpen
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
}
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SECTION 2 â€” COMPONENTS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// --- AnnotationLayer.jsx ---
export function AnnotationLayer(props) {
    const { updateAnnotation, setSelectedAnnotationId } = useContext(AnnotationContext);
    const { zoom, tool, selectedAnnotationId } = props;
    
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartCoords, setDragStartCoords] = useState(null);
    const [draggingAnnId, setDraggingAnnId] = useState(null);

    const handleAnnotationPointerDown = (e, ann) => {
        if (tool === 'select') {
            e.stopPropagation();
            setSelectedAnnotationId(ann.id);
            setDraggingAnnId(ann.id);
            setDragStartCoords({ x: e.clientX, y: e.clientY });
            setIsDragging(true);
        }
        
        // If the tool's original handler was passed and we are NOT in select mode, 
        // we could call it, but usually the tool's handler is only for select anyway.
        // Actually, we should call the original one too just in case it handles something else.
        if (props.handleAnnotationPointerDown && tool !== 'select') {
            props.handleAnnotationPointerDown(e, ann);
        }
    };

    useEffect(() => {
        const handlePointerMove = (e) => {
            if (isDragging && draggingAnnId) {
                const dx = (e.clientX - dragStartCoords.x) / zoom;
                const dy = (e.clientY - dragStartCoords.y) / zoom;
                
                const ann = props.annotations.find(a => a.id === draggingAnnId);
                if (!ann) return;

                let newProps = {};
                if ('x' in ann && 'y' in ann) {
                    newProps = { x: ann.x + dx, y: ann.y + dy };
                } else if ('startX' in ann) {
                    newProps = { startX: ann.startX + dx, startY: ann.startY + dy, endX: ann.endX + dx, endY: ann.endY + dy };
                } else if (ann.vertices) {
                    newProps = { vertices: ann.vertices.map(v => ({ x: v.x + dx, y: v.y + dy })) };
                } else if (ann.rects) {
                    newProps = { rects: ann.rects.map(r => ({ ...r, x: r.x + dx, y: r.y + dy })) };
                } else if (ann.points) {
                    newProps = { points: ann.points.map(p => [p[0] + dx, p[1] + dy, ...p.slice(2)]) };
                }

                updateAnnotation(draggingAnnId, newProps);
                setDragStartCoords({ x: e.clientX, y: e.clientY });
            }
        };

        const handlePointerUp = () => {
            setIsDragging(false);
            setDraggingAnnId(null);
        };

        if (isDragging) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, draggingAnnId, dragStartCoords, zoom, updateAnnotation, props.annotations]);

    return props.annotations.filter(a => a.visibility).map(ann => {
        const isSelected = selectedAnnotationId === ann.id;
        const p = { ...props, ann, isSelected, handleAnnotationPointerDown, updateAnnotation };
        switch (ann.type) {
            case 'area': return <AreaToolRenderer key={ann.id} {...p} />;
            case 'arrow': return <ArrowToolRenderer key={ann.id} {...p} />;
            case 'callout': return <CalloutToolRenderer key={ann.id} {...p} />;
            case 'cloud': return <CloudToolRenderer key={ann.id} {...p} />;
            case 'distance': return <DistanceToolRenderer key={ann.id} {...p} />;
            case 'ellipse': return <EllipseToolRenderer key={ann.id} {...p} />;
            case 'freetext': return <FreeTextToolRenderer key={ann.id} {...p} />;
            case 'highlight': return <HighlightToolRenderer key={ann.id} {...p} />;
            case 'ink': return <InkToolRenderer key={ann.id} {...p} />;
            case 'line': return <LineToolRenderer key={ann.id} {...p} />;
            case 'measurement': return <MeasurementToolRenderer key={ann.id} {...p} />;
            case 'pencil': return <PencilToolRenderer key={ann.id} {...p} />;
            case 'polygon': return <PolygonToolRenderer key={ann.id} {...p} />;
            case 'polyline': return <PolylineToolRenderer key={ann.id} {...p} />;
            case 'rectangle': return <RectangleToolRenderer key={ann.id} {...p} />;
            case 'squiggly': return <SquigglyToolRenderer key={ann.id} {...p} />;
            case 'stamp': return <StampToolRenderer key={ann.id} {...p} />;
            case 'sticky': return <StickyNoteToolRenderer key={ann.id} {...p} />;
            case 'strikeout': return <StrikeoutToolRenderer key={ann.id} {...p} />;
            case 'textbox': return <TextBoxToolRenderer key={ann.id} {...p} />;
            case 'underline': return <UnderlineToolRenderer key={ann.id} {...p} />;
            case 'stickynote': return <StickyNoteToolRenderer key={ann.id} {...p} />;
            default: return null;
        }
    });
}

// --- CommentPanel.jsx ---
const typeIcons = {
    pencil: <Pencil size={14} />,
    ink: <Pencil size={14} />,
    highlight: <Highlighter size={14} />,
    underline: <Type size={14} />,
    strikeout: <Type size={14} />,
    squiggly: <Type size={14} />,
    rectangle: <Square size={14} />,
    polygon: <Square size={14} />,
    cloud: <Square size={14} />,
    ellipse: <Circle size={14} />,
    line: <Minus size={14} />,
    arrow: <Minus size={14} />,
    polyline: <Minus size={14} />,
    measurement: <Ruler size={14} />,
    area: <Maximize size={14} />,
    distance: <Milestone size={14} />,
    freetext: <Type size={14} />,
    textbox: <Type size={14} />,
    stickynote: <MessageSquare size={14} />,
    stamp: <Hash size={14} />,
    callout: <MessageSquare size={14} />
};

export function CommentPanel() {
    const { 
        annotations, 
        selectedAnnotationId, 
        setSelectedAnnotationId, 
        deleteAnnotation,
        isCommentPanelOpen,
        setIsCommentPanelOpen,
        addReply,
        deleteReply,
        updateAnnotation,
        setIsPropertiesPanelOpen
    } = useContext(AnnotationContext);

    const [expandedPages, setExpandedPages] = useState({});
    const [replyInputs, setReplyInputs] = useState({}); // { annotationId: text }
    
    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, RESOLVED, UNRESOLVED
    const [filterType, setFilterType] = useState('ALL'); // ALL, rectangle, stickynote, etc.
    const [filterReplies, setFilterReplies] = useState('ALL'); // ALL, YES, NO
    const [searchQuery, setSearchQuery] = useState('');

    const togglePage = (pageNumber) => {
        setExpandedPages(prev => ({
            ...prev,
            [pageNumber]: !prev[pageNumber]
        }));
    };

    const handleReplySubmit = (annotationId) => {
        const text = replyInputs[annotationId]?.trim();
        if (text) {
            addReply(annotationId, text);
            setReplyInputs(prev => ({ ...prev, [annotationId]: '' }));
        }
    };

    const clearFilters = () => {
        setFilterStatus('ALL');
        setFilterType('ALL');
        setFilterReplies('ALL');
        setSearchQuery('');
    };

    // Filter & Group annotations
    const groupedAnnotations = useMemo(() => {
        const groups = {};
        
        // 1. Filter the annotations
        const filteredAnnotations = annotations.filter(ann => {
            // Status Check
            if (filterStatus === 'RESOLVED' && !ann.resolved) return false;
            if (filterStatus === 'UNRESOLVED' && ann.resolved) return false;
            
            // Type Check
            if (filterType !== 'ALL' && ann.type !== filterType) return false;
            
            // Replies Check
            const hasReplies = ann.replies && ann.replies.length > 0;
            if (filterReplies === 'YES' && !hasReplies) return false;
            if (filterReplies === 'NO' && hasReplies) return false;
            
            // Search Query Check (Enterprise Engine)
            if (searchQuery.trim() !== '') {
                if (!evaluateSearchQuery(ann, searchQuery)) {
                    return false;
                }
            }
            
            return true;
        });

        // 2. Group by page
        filteredAnnotations.forEach(ann => {
            if (!groups[ann.pageNumber]) {
                groups[ann.pageNumber] = [];
            }
            groups[ann.pageNumber].push(ann);
        });
        
        // 3. Sort pages and within pages
        const sortedGroups = {};
        Object.keys(groups).sort((a, b) => Number(a) - Number(b)).forEach(page => {
            sortedGroups[page] = groups[page].sort((a, b) => new Date(b.createdDate || 0) - new Date(a.createdDate || 0));
        });
        
        return sortedGroups;
    }, [annotations, filterStatus, filterType, filterReplies, searchQuery]);

    const activeFilterCount = (filterStatus !== 'ALL' ? 1 : 0) + (filterType !== 'ALL' ? 1 : 0) + (filterReplies !== 'ALL' ? 1 : 0) + (searchQuery !== '' ? 1 : 0);
    const uniqueTypes = [...new Set(annotations.map(a => a.type))];

    if (!isCommentPanelOpen) return null;

    return (
        <div className="fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-200 bg-white shadow-sm z-10">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <MessageSquare size={20} className="text-blue-600" />
                        <h2 className="text-lg font-semibold">Comments</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {annotations.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`relative p-1.5 rounded-lg transition-colors flex items-center justify-center ${isFilterOpen || activeFilterCount > 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                            title="Filter Comments"
                        >
                            <Filter size={18} />
                            {activeFilterCount > 0 && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            )}
                        </button>
                        <button 
                            onClick={() => setIsCommentPanelOpen(false)}
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filter Toolbar Expandable */}
                {isFilterOpen && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={14} className="text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Search comments..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            />
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center group cursor-help">
                                <Info size={14} className="text-gray-400 hover:text-blue-500" />
                                <div className="absolute top-8 right-0 w-64 p-3 bg-gray-800 text-white text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    <p className="font-bold mb-1 border-b border-gray-600 pb-1">Advanced Search Options</p>
                                    <ul className="list-disc pl-4 space-y-1 mt-2 text-gray-200">
                                        <li><strong>Exact Phrase:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">"fix this"</span></li>
                                        <li><strong>Boolean Logic:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">bug AND UI</span> or <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">OR NOT</span></li>
                                        <li><strong>Wildcards:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">net*ork</span></li>
                                        <li><strong>Metadata Fields:</strong> <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">type:rectangle</span> or <span className="font-mono bg-gray-700 px-1 rounded text-[10px]">author:"John"</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Status</label>
                                <select 
                                    value={filterStatus} 
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="RESOLVED">Resolved Only</option>
                                    <option value="UNRESOLVED">Unresolved Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Type</label>
                                <select 
                                    value={filterType} 
                                    onChange={e => setFilterType(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none capitalize"
                                >
                                    <option value="ALL">All Types</option>
                                    {uniqueTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-medium mb-1">Replies</label>
                                <select 
                                    value={filterReplies} 
                                    onChange={e => setFilterReplies(e.target.value)}
                                    className="w-full p-1.5 bg-white border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                >
                                    <option value="ALL">Any</option>
                                    <option value="YES">Has Replies</option>
                                    <option value="NO">No Replies</option>
                                </select>
                            </div>
                        </div>

                        {activeFilterCount > 0 && (
                            <button 
                                onClick={clearFilters}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium self-end flex items-center gap-1 mt-1"
                            >
                                <X size={12} /> Clear Filters ({activeFilterCount})
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3">
                {annotations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center p-6">
                        <MessageSquare size={48} className="opacity-20" />
                        <p className="text-sm">No annotations yet. Select a tool and draw on the PDF to get started.</p>
                    </div>
                ) : Object.keys(groupedAnnotations).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center p-6">
                        <Filter size={48} className="opacity-20 text-blue-600" />
                        <p className="text-sm font-medium text-gray-600">No comments match your filters.</p>
                        <button 
                            onClick={clearFilters}
                            className="mt-2 text-sm text-blue-600 font-medium hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    Object.entries(groupedAnnotations).map(([pageNumber, anns]) => (
                        <div key={`page-${pageNumber}`} className="mb-4">
                            <button 
                                onClick={() => togglePage(pageNumber)}
                                className="w-full flex items-center justify-between px-3 py-2 bg-gray-200/80 hover:bg-gray-300 rounded-lg transition-colors text-sm font-semibold text-gray-700 mb-2"
                            >
                                <div className="flex items-center gap-2">
                                    {expandedPages[pageNumber] === false ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                                    Page {pageNumber}
                                </div>
                                <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full">{anns.length}</span>
                            </button>
                            
                            {expandedPages[pageNumber] !== false && (
                                <div className="flex flex-col gap-2">
                                    {anns.map(ann => {
                                        const isSelected = selectedAnnotationId === ann.id;
                                        
                                        return (
                                            <div 
                                                key={ann.id}
                                                onClick={() => !isSelected && setSelectedAnnotationId(ann.id)}
                                                className={`flex flex-col rounded-xl border transition-all ${
                                                    isSelected 
                                                        ? 'bg-white border-blue-300 shadow-md ring-1 ring-blue-100' 
                                                        : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer shadow-sm'
                                                }`}
                                            >
                                                {/* Parent Annotation Header */}
                                                <div className="flex items-start gap-3 p-3">
                                                    <div 
                                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white shadow-sm mt-0.5"
                                                        style={{ backgroundColor: ann.strokeColor || ann.color || '#3b82f6' }}
                                                    >
                                                        {typeIcons[ann.type] || <MessageSquare size={14} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className={`text-sm font-bold capitalize truncate flex items-center gap-2 ${ann.resolved ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                                {ann.authorName || 'Author'}
                                                                <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase tracking-wider no-underline">
                                                                    {ann.type}
                                                                </span>
                                                                {ann.resolved && (
                                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase tracking-wider no-underline">
                                                                        Resolved
                                                                    </span>
                                                                )}
                                                            </h4>
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                {ann.createdDate ? new Date(ann.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                            </span>
                                                        </div>
                                                        
                                                        {ann.text && (
                                                            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                                                                {ann.text}
                                                            </p>
                                                        )}

                                                        {ann.unit && (
                                                            <p className="text-xs font-mono bg-gray-50 p-1.5 rounded text-gray-600 mt-2 border border-gray-100 inline-block">
                                                                Measured in {ann.unit}
                                                            </p>
                                                        )}
                                                        
                                                        {/* Preview of replies if not selected */}
                                                        {!isSelected && ann.replies && ann.replies.length > 0 && (
                                                            <div className="mt-2 text-xs font-semibold text-blue-600 flex items-center gap-1">
                                                                <MessageSquare size={12} /> {ann.replies.length} replies
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="flex flex-col gap-1 items-center mt-0.5">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setIsPropertiesPanelOpen(true);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors flex-shrink-0"
                                                                title="Edit Properties"
                                                            >
                                                                <Sliders size={16} />
                                                            </button>

                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateAnnotation(ann.id, { resolved: !ann.resolved });
                                                                }}
                                                                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${ann.resolved ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                                                title={ann.resolved ? "Reopen Thread" : "Resolve Thread"}
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteAnnotation(ann.id);
                                                                }}
                                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                                                                title="Delete Annotation"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded Thread View */}
                                                {isSelected && (
                                                    <div className="bg-slate-50 border-t border-gray-100 rounded-b-xl flex flex-col">
                                                        {/* Replies List */}
                                                        {ann.replies && ann.replies.length > 0 && (
                                                            <div className="flex flex-col gap-3 p-3">
                                                                {ann.replies.map(reply => (
                                                                    <div key={reply.id} className="flex gap-2 relative">
                                                                        <div className="absolute left-[11px] top-0 bottom-[-12px] w-px bg-gray-200 last:hidden"></div>
                                                                        <div className="mt-1 relative z-10 flex-shrink-0 text-gray-400 bg-slate-50 rounded-full">
                                                                            <CornerDownRight size={14} />
                                                                        </div>
                                                                        <div className="flex-1 bg-white border border-gray-200 p-2.5 rounded-lg shadow-sm">
                                                                            <div className="flex items-center justify-between mb-1">
                                                                                <span className="text-xs font-bold text-gray-800">{reply.authorName}</span>
                                                                                <span className="text-[10px] text-gray-400">
                                                                                    {new Date(reply.createdDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                                                                            <div className="flex justify-end mt-1">
                                                                                <button 
                                                                                    onClick={() => deleteReply(ann.id, reply.id)}
                                                                                    className="text-[10px] font-medium text-red-500 hover:text-red-700"
                                                                                >
                                                                                    Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Reply Input */}
                                                        <div className="p-3 border-t border-gray-200/60 bg-white rounded-b-xl">
                                                            <div className="flex gap-2">
                                                                <input 
                                                                    type="text"
                                                                    placeholder="Reply to this thread..."
                                                                    value={replyInputs[ann.id] || ''}
                                                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [ann.id]: e.target.value }))}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleReplySubmit(ann.id);
                                                                        }
                                                                    }}
                                                                    className="flex-1 text-sm bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 outline-none transition-all"
                                                                />
                                                                <button 
                                                                    onClick={() => handleReplySubmit(ann.id)}
                                                                    disabled={!replyInputs[ann.id]?.trim()}
                                                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-colors flex items-center justify-center"
                                                                >
                                                                    <Send size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// --- Dashboard.jsx ---
export function Dashboard({ onNavigate }) {
  const { annotations, setIsCommentPanelOpen, setIsPropertiesPanelOpen } = useContext(AnnotationContext);

  const { setIsHistoryPanelOpen } = useContext(HistoryContext);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const features = [
    { id: 'draw-markup', title: 'Ultimate Annotation Suite', description: 'Highlight, underline, add squiggly lines to text, draw freehand lines, shapes, polygons, clouds, measure distances, and add official stamps, interactive sticky notes, and text callouts with directional leader lines all in one place!', icon: <Pencil className="w-5 h-5 text-blue-600" />, active: true }
  ];

  const categories = [
    { title: "Ultimate Annotation Suite", ids: ['draw-markup'] }
  ];


  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans print:bg-white print:block">
      
      {/* 1. TOP NAVBAR (File Actions) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden shadow-sm">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
               <PenTool className="text-white w-5 h-5" />
             </div>
             <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">Review and Annotation</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
            >
              <PieChart size={16} /> <span className="hidden sm:inline">Summary Report</span>
            </button>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              title="Export Comments"
            >
              <DownloadCloud size={16} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium shadow-sm transition-all text-sm"
              title="Import Comments"
            >
              <UploadCloud size={16} /> <span className="hidden sm:inline">Import</span>
            </button>
          </div>
        </div>
      </div>


      {/* 3. CATEGORIZED TOOL GRID */}
      <div className="flex-1 max-w-[90rem] mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 print:hidden space-y-16">
        {categories.map(category => (
           <div key={category.title} className="relative">
              <h3 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-4">
                 {category.title}
                 <div className="h-px bg-slate-200 flex-1 mt-1"></div>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {category.ids.map(id => {
                    const feature = features.find(f => f.id === id);
                    if (!feature) return null;
                    return (
                      <div 
                        key={feature.id} 
                        className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col hover:shadow-xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                        onClick={() => feature.active ? onNavigate(feature.id) : alert('This tool is not yet implemented.')}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                            {feature.icon}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 leading-tight">
                            {feature.title}
                          </h4>
                        </div>
                        
                        <p className="text-slate-500 text-xs leading-relaxed mb-4 flex-grow">
                          {feature.description}
                        </p>
                        
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                           <span className={`font-semibold text-xs ${feature.active ? 'text-indigo-600 group-hover:text-indigo-700' : 'text-slate-400'}`}>
                              {feature.active ? 'Open Tool' : 'Coming Soon'}
                           </span>
                           <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${feature.active ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100' : 'bg-slate-50 text-slate-300'}`}>
                             <ArrowRight className="w-3.5 h-3.5" />
                           </div>
                        </div>
                      </div>
                    );
                 })}
              </div>
           </div>
        ))}
      </div>

      <ImportCommentsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <ExportCommentsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <SummaryReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
      <PropertiesPanel />
    </div>
  );
}

// --- DrawAndMarkupTool.jsx ---

// ==========================================
// UTILS
// hexToRgb, getSquigglyPath, getSvgPathFromStroke, getArrowHeadPoints,
// getCalloutArrowPoints, generateCloudPath, calculateDistance,
// calculateTotalDistancePx, calculatePolygonAreaPx, formatMeasurement,
// formatArea, getCentroid — all defined in SECTION 1 (Utilities)

const ICON_MAP = {
  'Note': MessageSquare,
  'Comment': MessageCircle,
  'Help': HelpCircle,
  'Key': Key,
  'Check': CheckCircle,
  'Cross': XCircle,
  'Star': Star,
  'Info': Info,
};

const getStrokeDashArray = (style, width, zoom = 1) => {
    const w = width / zoom;
    if (style === 'dashed') return `${w * 4}, ${w * 4}`;
    if (style === 'dotted') return `${w}, ${w * 2}`;
    return "none";
}

const renderPolygonOrPolyline = (vertices, previewCoord) => {
    if (!vertices || vertices.length === 0) return null;
    let points = vertices.map(v => `${v.x},${v.y}`).join(' ');
    if (previewCoord) {
        points += ` ${previewCoord.x},${previewCoord.y}`;
    }
    return points;
}


// ==========================================
// CALIBRATION MODAL
// ==========================================
function CalibrationModal({ isOpen, onClose, onCalibrate }) {
  const [inputValue, setInputValue] = useState('');
  const [unit, setUnit] = useState('m');
  const [lineStart, setLineStart] = useState(null);
  const [lineEnd, setLineEnd] = useState(null);
  
  if (!isOpen) return null;

  const handleCalibrate = () => {
    if (!lineStart || !lineEnd) {
      alert("Please draw a calibration line first.");
      return;
    }
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    
    const distPx = calculateDistance(lineStart.x, lineStart.y, lineEnd.x, lineEnd.y);
    const realInches = val * unitToInches[unit];
    const newPixelsPerInch = distPx / realInches;
    onCalibrate(newPixelsPerInch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-96 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Settings2 size={24} className="text-blue-600" />
          Scale Calibration
        </h2>
        
        <p className="text-sm text-gray-600">
          Click and drag below to draw a reference line, then specify its real-world length.
        </p>

        <div 
          className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg relative cursor-crosshair overflow-hidden"
          onPointerDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setLineStart({x, y});
            setLineEnd({x, y});
          }}
          onPointerMove={(e) => {
            if (e.buttons !== 1 || !lineStart) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setLineEnd({
              x: e.clientX - rect.left,
              y: e.clientY - rect.top
            });
          }}
        >
          {lineStart && lineEnd && (
            <svg className="w-full h-full pointer-events-none absolute inset-0">
              <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#3b82f6" strokeWidth={2} markerEnd="url(#calib-arrow)" markerStart="url(#calib-arrow)"/>
              <defs>
                  <marker id="calib-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                  </marker>
              </defs>
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-2">
          <label className="text-xs font-semibold text-gray-500">Real-world length of the line</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 10.5"
            />
            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg outline-none">
              {['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
          <button 
            onClick={handleCalibrate} 
            disabled={!lineStart || !lineEnd || lineStart.x === lineEnd.x}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Apply Calibration
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TOOLBAR
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor, fillColor, setFillColor,
  underlineStyle, setUnderlineStyle, strikeoutStyle, setStrikeoutStyle,
  waveStyle, setWaveStyle, strokeWidth, setStrokeWidth,
  penStyle, setPenStyle, textColor, setTextColor,
  borderStyle, setBorderStyle, joinStyle, setJoinStyle,
  cloudRadius, setCloudRadius, unit, setUnit, precision, setPrecision,
  fontSize, setFontSize, opacity, setOpacity,
  stampText, setStampText, isCustomStamp, setIsCustomStamp, customStampText, setCustomStampText, stampWidth, setStampWidth, stampRotation, setStampRotation,
  iconType, setIconType, calloutText, setCalloutText,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack,
  onOpenCalibration, onToggleComments
}) {
  const highlightColors = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e9d5ff'];
  const generalColors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#eab308', '#ffffff'];
  const fillColors = ['transparent', ...generalColors];
  const stickyColors = ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#6b7280'];
  const stamps = ['APPROVED', 'REJECTED', 'CONFIDENTIAL', 'DRAFT', 'REVIEWED'];
  
  const distanceUnits = ['pt', 'mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'];
  const areaUnits = ['ptÃ‚Â²', 'mmÃ‚Â²', 'cmÃ‚Â²', 'mÃ‚Â²', 'kmÃ‚Â²', 'inÃ‚Â²', 'ftÃ‚Â²', 'ydÃ‚Â²', 'acre', 'hectare'];
  const precisions = [0, 1, 2, 3];

  const isMarkup = ['highlight', 'underline', 'strikeout', 'squiggly'].includes(tool);
  const isWriting = ['pencil', 'ink', 'freetext', 'textbox'].includes(tool);
  const isShape = ['arrow', 'line', 'rectangle', 'ellipse', 'polygon', 'polyline', 'cloud'].includes(tool);
  const isMeasurement = ['measurement', 'distance', 'area'].includes(tool);
  
  const hasFill = ['rectangle', 'ellipse', 'polygon', 'cloud', 'area'].includes(tool);
  const hasBorderStyle = ['polygon', 'polyline'].includes(tool);
  const hasCloudRadius = tool === 'cloud';
  const currentUnits = tool === 'area' ? areaUnits : distanceUnits;

  let activeColors = generalColors;
  if (tool === 'highlight') activeColors = highlightColors;
  else if (isMarkup) activeColors = generalColors.filter(c => c !== '#ffffff');
  else if (tool === 'sticky') activeColors = stickyColors;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm shrink-0 z-40 rounded-2xl border pointer-events-auto">
      <div className="px-2 sm:px-3 py-2 flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-full sm:w-auto">
        <button onClick={onToggleComments} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all mr-1" title="Toggle Comments"><MessageSquare size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* TOOL SELECTION */}
      <div className="flex flex-col gap-1 w-full sm:w-auto min-w-0 bg-gray-50 p-1 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center justify-center gap-1 w-full">
            <button onClick={() => setTool('highlight')} className={`p-1.5 rounded-lg transition-all ${tool === 'highlight' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Highlight Tool"><Highlighter size={16} /></button>
            <button onClick={() => setTool('underline')} className={`p-1.5 rounded-lg transition-all ${tool === 'underline' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Underline Tool"><UnderlineIcon size={16} /></button>
            <button onClick={() => setTool('strikeout')} className={`p-1.5 rounded-lg transition-all ${tool === 'strikeout' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Strikeout Tool"><StrikeIcon size={16} /></button>
            <button onClick={() => setTool('squiggly')} className={`p-1.5 rounded-lg transition-all ${tool === 'squiggly' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Squiggly Tool"><SquigglyIcon size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1 shrink-0"></div>
            <button onClick={() => setTool('pencil')} className={`p-1.5 rounded-lg transition-all ${tool === 'pencil' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Pencil Tool"><Pencil size={16} /></button>
            <button onClick={() => setTool('ink')} className={`p-1.5 rounded-lg transition-all ${tool === 'ink' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Ink Tool"><PenTool size={16} /></button>
            <button onClick={() => setTool('freetext')} className={`p-1.5 rounded-lg transition-all ${tool === 'freetext' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Free Text Tool"><AlignLeft size={16} /></button>
            <button onClick={() => setTool('textbox')} className={`p-1.5 rounded-lg transition-all ${tool === 'textbox' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Text Box Tool"><Type size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1 shrink-0"></div>
            <button onClick={() => setTool('select')} className={`p-1.5 rounded-lg transition-all ${tool === 'select' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={16} /></button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 w-full">
            <button onClick={() => setTool('arrow')} className={`p-1.5 rounded-lg transition-all ${tool === 'arrow' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Arrow Tool"><ArrowRight size={16} /></button>
            <button onClick={() => setTool('line')} className={`p-1.5 rounded-lg transition-all ${tool === 'line' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Line Tool"><Minus size={16} /></button>
            <button onClick={() => setTool('rectangle')} className={`p-1.5 rounded-lg transition-all ${tool === 'rectangle' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Rectangle Tool"><Square size={16} /></button>
            <button onClick={() => setTool('ellipse')} className={`p-1.5 rounded-lg transition-all ${tool === 'ellipse' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Circle / Ellipse Tool"><Circle size={16} /></button>
            <button onClick={() => setTool('polygon')} className={`p-1.5 rounded-lg transition-all ${tool === 'polygon' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Polygon Tool"><Hexagon size={16} /></button>
            <button onClick={() => setTool('polyline')} className={`p-1.5 rounded-lg transition-all ${tool === 'polyline' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Polyline Tool"><Activity size={16} /></button>
            <button onClick={() => setTool('cloud')} className={`p-1.5 rounded-lg transition-all ${tool === 'cloud' ? 'bg-white shadow text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Cloud Tool"><Cloud size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1 shrink-0"></div>
            <button onClick={() => setTool('measurement')} className={`p-1.5 rounded-lg transition-all ${tool === 'measurement' ? 'bg-white shadow text-emerald-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Measurement Tool"><Ruler size={16} /></button>
            <button onClick={() => setTool('distance')} className={`p-1.5 rounded-lg transition-all ${tool === 'distance' ? 'bg-white shadow text-emerald-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Distance Tool"><Milestone size={16} /></button>
            <button onClick={() => setTool('area')} className={`p-1.5 rounded-lg transition-all ${tool === 'area' ? 'bg-white shadow text-emerald-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Area Tool"><Square size={16} /></button>
            <div className="w-px h-4 bg-gray-300 mx-1 shrink-0"></div>
            <button onClick={() => setTool('stamp')} className={`p-1.5 rounded-lg transition-all ${tool === 'stamp' ? 'bg-white shadow text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Stamp Tool"><Stamp size={16} /></button>
            <button onClick={() => setTool('sticky')} className={`p-1.5 rounded-lg transition-all ${tool === 'sticky' ? 'bg-white shadow text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Sticky Note Tool"><MessageSquare size={16} /></button>
            <button onClick={() => setTool('callout')} className={`p-1.5 rounded-lg transition-all ${tool === 'callout' ? 'bg-white shadow text-indigo-600' : 'hover:bg-gray-100 text-gray-600'}`} title="Callout Tool"><MessageSquare size={16} className="scale-x-[-1]" /></button>
        </div>
      </div>
      
      {(tool === 'underline' || tool === 'strikeout' || tool === 'squiggly' || tool === 'ink') && (
        <>
          <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 shrink-0 w-full sm:w-max">
            {tool === 'underline' && (
              <select value={underlineStyle} onChange={(e) => {
                  const val = e.target.value; setUnderlineStyle(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { underlineStyle: val });
              }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium">
                <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option>
              </select>
            )}
            {tool === 'strikeout' && (
              <select value={strikeoutStyle} onChange={(e) => {
                  const val = e.target.value; setStrikeoutStyle(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strikeoutStyle: val });
              }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium">
                <option value="solid">Solid</option><option value="dashed">Dashed</option><option value="dotted">Dotted</option><option value="double">Double</option>
              </select>
            )}
            {tool === 'squiggly' && (
              <select value={waveStyle} onChange={(e) => {
                  const val = e.target.value; setWaveStyle(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { waveStyle: val });
              }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium">
                <option value="standard">Standard Wave</option><option value="small">Small Wave</option><option value="large">Large Wave</option><option value="zigzag">Zigzag</option>
              </select>
            )}
            {tool === 'ink' && (
              <select value={penStyle} onChange={(e) => {
                  const val = e.target.value; setPenStyle(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { penStyle: val });
              }} className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium">
                {Object.entries(PEN_PROFILES).map(([key, profile]) => (<option key={key} value={key}>{profile.name}</option>))}
              </select>
            )}
          </div>
        </>
      )}

      {(tool === 'stamp' || tool === 'sticky' || tool === 'callout') && (
        <>
          <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
          <div className="flex items-center gap-2 shrink-0 w-max">
            {tool === 'stamp' && (
              <>
                <select 
                  value={isCustomStamp ? "CUSTOM" : stampText} 
                  onChange={(e) => { 
                    const val = e.target.value;
                    if (val === "CUSTOM") {
                      setIsCustomStamp(true);
                      setStampText(customStampText);
                      if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: customStampText });
                    } else {
                      setIsCustomStamp(false);
                      setStampText(val);
                      if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: val });
                    }
                  }}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-bold cursor-pointer"
                >
                  {stamps.map(s => <option key={s} value={s}>{s}</option>)}
                  <option value="CUSTOM">Custom...</option>
                </select>
                
                {isCustomStamp && (
                  <input 
                    type="text" 
                    value={customStampText}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setCustomStampText(val);
                      const finalVal = val || ' ';
                      setStampText(finalVal);
                      if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: finalVal });
                    }}
                    placeholder="TYPE HERE"
                    maxLength={20}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-bold uppercase w-32"
                  />
                )}
              </>
            )}

            {tool === 'sticky' && (
              <select 
                value={iconType} 
                onChange={(e) => {
                  const val = e.target.value;
                  setIconType(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { iconType: val });
                }}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium cursor-pointer"
              >
                {Object.keys(ICON_MAP).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            )}

            {tool === 'callout' && (
              <input 
                type="text" 
                value={calloutText}
                onChange={(e) => {
                  const val = e.target.value;
                  setCalloutText(val);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: val || ' ' });
                }}
                placeholder="Callout text..."
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 outline-none font-medium w-48"
              />
            )}
          </div>
        </>
      )}

      {hasBorderStyle && (
        <>
            <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
            <div className="flex flex-col gap-1 shrink-0">
                <select value={borderStyle} onChange={(e) => {
                    setBorderStyle(e.target.value);
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { borderStyle: e.target.value });
                }} className="text-[10px] border rounded p-1 w-20 outline-none">
                    <option value="solid">Solid</option>
                    <option value="dashed">Dashed</option>
                    <option value="dotted">Dotted</option>
                </select>
                <select value={joinStyle} onChange={(e) => {
                    setJoinStyle(e.target.value);
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { joinStyle: e.target.value });
                }} className="text-[10px] border rounded p-1 w-20 outline-none">
                    <option value="miter">Miter Join</option>
                    <option value="round">Round Join</option>
                    <option value="bevel">Bevel Join</option>
                </select>
            </div>
        </>
      )}

      {/* Colors Section */}
      {tool !== 'select' && (
        <>
        <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
        <div className="flex flex-col gap-1 shrink-0">
          {(isMarkup || tool === 'pencil' || tool === 'ink' || isShape || isMeasurement || tool === 'stamp' || tool === 'sticky' || tool === 'callout') && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-500 w-8">Stroke</span>
              {(!isMarkup && tool !== 'stamp' && tool !== 'sticky') && (
                <button onClick={() => {
                    setStrokeColor('transparent');
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strokeColor: 'transparent', color: 'transparent' });
                }} className={`w-4 h-4 rounded-full border border-dashed border-gray-400 flex items-center justify-center transition-transform ${strokeColor === 'transparent' ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`} title="Transparent">
                    <div className="w-full h-[1px] bg-red-500 rotate-45"></div>
                </button>
              )}
              {activeColors.map(c => (
                <button key={`s-${c}`} onClick={() => {
                  setStrokeColor(c);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: c, strokeColor: c });
                }} className={`w-4 h-4 rounded-full border border-gray-300 transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}
          
          {(tool === 'freetext' || tool === 'textbox') && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-500 w-8">Text</span>
              {generalColors.map(c => (
                <button key={`t-${c}`} onClick={() => {
                  setTextColor(c);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { textColor: c });
                }} className={`w-4 h-4 rounded-full border border-gray-300 transition-transform ${textColor === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}

          {(tool === 'textbox' || hasFill) && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-semibold text-gray-500 w-8">Fill</span>
              <button onClick={() => {
                setFillColor('transparent');
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { bgColor: 'transparent', fillColor: 'transparent' });
              }} className={`w-4 h-4 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center transition-transform ${fillColor === 'transparent' ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`} title="Transparent">
                <div className="w-full h-px bg-red-500 rotate-45"></div>
              </button>
              {generalColors.slice(1).map(c => (
                <button key={`bg-${c}`} onClick={() => {
                  setFillColor(c);
                  if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { bgColor: c, fillColor: c });
                }} className={`w-4 h-4 rounded-full border border-gray-300 transition-transform ${fillColor === c ? 'scale-125 ring-2 ring-offset-1 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
              ))}
            </div>
          )}
        </div>
        </>
      )}

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* Sliders Section */}
      <div className="flex flex-col gap-1 w-28 shrink-0">
        {(tool !== 'highlight' && tool !== 'select' && tool !== 'freetext' && tool !== 'textbox') && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Width</span>
            <input type="range" min="1" max={tool === 'pencil' || tool === 'ink' ? "30" : "15"} step="1" value={strokeWidth} onChange={(e) => {
              const val = Number(e.target.value);
              setStrokeWidth(val);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { width: val, borderWidth: val });
            }} className="w-full cursor-pointer accent-blue-500 h-1" />
          </div>
        )}
        {(tool === 'freetext' || tool === 'textbox') && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Size</span>
            <input type="range" min="10" max="72" step="1" value={fontSize} onChange={(e) => {
              const val = Number(e.target.value);
              setFontSize(val);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { fontSize: val });
            }} className="w-full cursor-pointer accent-blue-500 h-1" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Opacity</span>
          <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => {
            const val = Number(e.target.value);
            setOpacity(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { opacity: val });
          }} className="w-full cursor-pointer accent-blue-500 h-1" />
        </div>
        {hasCloudRadius && (
            <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Radius</span>
            <input type="range" min="5" max="50" step="1" value={cloudRadius} onChange={(e) => {
                const val = Number(e.target.value);
                setCloudRadius(val);
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { cloudRadius: val });
            }} className="w-full cursor-pointer accent-blue-500 h-1" title="Cloud Radius" />
            </div>
        )}
        {tool === 'stamp' && (
            <>
                <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Width</span>
                <input type="range" min="100" max="400" step="10" value={stampWidth} onChange={(e) => {
                    const val = Number(e.target.value);
                    setStampWidth(val);
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { width: val, height: val * 0.32 });
                }} className="w-full cursor-pointer accent-blue-500 h-1" />
                </div>
                <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Rotate</span>
                <input type="range" min="-180" max="180" step="5" value={stampRotation} onChange={(e) => {
                    const val = Number(e.target.value);
                    setStampRotation(val);
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { rotation: val });
                }} className="w-full cursor-pointer accent-blue-500 h-1" />
                </div>
            </>
        )}
        {tool === 'callout' && (
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Line W.</span>
                <input type="range" min="2" max="10" step="1" value={strokeWidth} onChange={(e) => {
                    const val = Number(e.target.value);
                    setStrokeWidth(val);
                    if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { width: val });
                }} className="w-full cursor-pointer accent-blue-500 h-1" />
            </div>
        )}
      </div>

      {isMeasurement && (
        <>
            <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
            <div className="flex flex-col gap-1 w-32 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-medium shrink-0 w-12">Unit</span>
                    <select value={unit} onChange={(e) => {
                        setUnit(e.target.value);
                        if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { unit: e.target.value });
                    }} className="text-[10px] bg-gray-50 border border-gray-200 rounded p-0.5 outline-none flex-1">
                        {currentUnits.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-medium shrink-0 w-12">Precision</span>
                    <select value={precision} onChange={(e) => {
                        const val = Number(e.target.value);
                        setPrecision(val);
                        if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { precision: val });
                    }} className="text-[10px] bg-gray-50 border border-gray-200 rounded p-0.5 outline-none flex-1">
                        {precisions.map(p => <option key={p} value={p}>{p} dec</option>)}
                    </select>
                </div>
            </div>
            
            <div className="w-24 shrink-0">
                <button onClick={onOpenCalibration} className="text-[10px] font-semibold bg-gray-800 text-white rounded p-1 hover:bg-gray-700 transition-colors w-full h-full">
                Calibrate Scale
                </button>
            </div>
        </>
      )}

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={undo} disabled={!canUndo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Undo"><Undo2 size={16} /></button>
        <button onClick={redo} disabled={!canRedo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Redo"><Redo2 size={16} /></button>
        <button onClick={() => deleteAnnotation(selectedAnnotationId)} disabled={!selectedAnnotationId} className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Delete Selected"><Trash2 size={16} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={zoomOut} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom Out"><ZoomOut size={16} /></button>
        <button onClick={resetZoom} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Reset Zoom"><Maximize size={16} /></button>
        <button onClick={zoomIn} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom In"><ZoomIn size={16} /></button>
      </div>
      </div>
    </div>
  );
}

// ==========================================
// DRAWING BOARD
// ==========================================
function DrawingBoard({
  annotations, addAnnotation, updateAnnotation, selectedAnnotationId,
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, fillColor,
  underlineStyle, strikeoutStyle, waveStyle, strokeWidth, borderWidth,
  penStyle, textColor, borderStyle, joinStyle, cloudRadius, unit, precision, fontSize,
  opacity, pageNumber, pixelsPerInch,
  stampText, stampWidth, stampRotation,
  iconType, calloutText
}) {
  const containerRef = useRef(null);

  const isMarkup = ['highlight', 'underline', 'strikeout', 'squiggly'].includes(tool);
  const isWriting = ['pencil', 'ink', 'freetext', 'textbox'].includes(tool);
  const is2PointTool = ['arrow', 'line', 'rectangle', 'ellipse', 'measurement', 'callout'].includes(tool);
  const isMultiPointTool = ['polygon', 'polyline', 'cloud', 'distance', 'area'].includes(tool);
  
  // States for continuous drawing
  const [isDrawingContinuous, setIsDrawingContinuous] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);

  // States for text box drawing
  const [currentBox, setCurrentBox] = useState(null);

  // States for 2-point drawing
  const [isDrawing2Pt, setIsDrawing2Pt] = useState(false);
  const [drawStart2Pt, setDrawStart2Pt] = useState(null);
  const [current2PtShape, setCurrent2PtShape] = useState(null);

  // States for multi-point drawing
  const [isDrawingMPt, setIsDrawingMPt] = useState(false);
  const [currentVertices, setCurrentVertices] = useState([]);
  const [currentMousePos, setCurrentMousePos] = useState(null);
  
  // Shared drag/resize states
  const [isDraggingWhole, setIsDraggingWhole] = useState(false);
  const [dragOffsetWhole, setDragOffsetWhole] = useState({ x: 0, y: 0 });
  const [dragStartVertices, setDragStartVertices] = useState([]); // for multi-point drag
  const [draggingAnnId, setDraggingAnnId] = useState(null);
  
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);
  
  const [isResizingBox, setIsResizingBox] = useState(false);
  const [resizeStartSize, setResizeStartSize] = useState(null);
  const [resizingVertexIndex, setResizingVertexIndex] = useState(null);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  // Handle Text Selection for Markups
  useEffect(() => {
    const handleMouseUp = () => {
      if (!isMarkup) return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      if (!selection.anchorNode || !selection.anchorNode.parentElement) return;
      if (!selection.anchorNode.parentElement.closest('.react-pdf__Page')) return;

      const range = selection.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      if (clientRects.length === 0) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const textString = selection.toString();

      const svgRects = clientRects.map(r => ({
        x: (r.left - containerRect.left - pan.x) / zoom,
        y: (r.top - containerRect.top - pan.y) / zoom,
        w: r.width / zoom,
        h: r.height / zoom
      }));

      if (tool === 'highlight') {
        addAnnotation({
          id: uuidv4(), type: 'highlight', pageNumber, text: textString,
          rects: svgRects, color: strokeColor, opacity,
          createdDate: new Date().toISOString(), visibility: true,
        });
      } else if (tool === 'underline') {
        addAnnotation({
          id: uuidv4(), type: 'underline', pageNumber, text: textString,
          rects: svgRects, color: strokeColor, underlineStyle: underlineStyle,
          width: strokeWidth, opacity,
          createdDate: new Date().toISOString(), visibility: true,
        });
      } else if (tool === 'strikeout') {
        addAnnotation({
          id: uuidv4(), type: 'strikeout', pageNumber, text: textString,
          rects: svgRects, color: strokeColor, strikeoutStyle: strikeoutStyle,
          width: strokeWidth, opacity,
          createdDate: new Date().toISOString(), visibility: true,
        });
      } else if (tool === 'squiggly') {
        addAnnotation({
          id: uuidv4(), type: 'squiggly', pageNumber, text: textString,
          rects: svgRects, color: strokeColor, waveStyle: waveStyle,
          width: strokeWidth, opacity,
          createdDate: new Date().toISOString(), visibility: true,
        });
      }

      selection.removeAllRanges();
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [tool, zoom, pan, strokeColor, underlineStyle, strikeoutStyle, waveStyle, strokeWidth, opacity, addAnnotation, pageNumber, isMarkup]);


  const handlePointerDown = (e) => {
    if (isMarkup) return;
    if (e.target.closest('.resize-handle') || e.target.closest('.sticky-popup')) return;

    const isOverlay = e.target.closest('.freetext-overlay') || e.target.closest('.textbox-overlay');
    
    if (tool === 'select' && !isOverlay && e.target.tagName !== 'path' && e.target.tagName !== 'rect' && e.target.tagName !== 'line' && e.target.tagName !== 'svg' && e.target.tagName !== 'DIV') {
      setSelectedAnnotationId(null);
      return;
    }
    
    if (tool === 'select' && (e.target.tagName === 'svg' || (e.target.tagName === 'DIV' && !isOverlay))) {
        setSelectedAnnotationId(null);
        return;
    }

    const coords = getCanvasCoordinates(e.clientX, e.clientY);

    if (tool === 'pencil' || tool === 'ink') {
        if (e.button !== 0 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
        const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
        setIsDrawingContinuous(true);
        setCurrentStroke({
            id: uuidv4(), type: tool, pageNumber,
            points: [[coords.x, coords.y, pressure]],
            color: strokeColor, width: strokeWidth,
            penStyle: tool === 'ink' ? penStyle : undefined,
            opacity, createdDate: new Date().toISOString(), visibility: true,
        });
        setSelectedAnnotationId(null);
    } else if (tool === 'freetext' && !isOverlay) {
        const newId = uuidv4();
        addAnnotation({
            id: newId, type: 'freetext', pageNumber,
            x: coords.x, y: coords.y, w: 250, h: 40,
            text: '', textColor, fontSize, opacity,
            createdDate: new Date().toISOString(), visibility: true,
        });
        setSelectedAnnotationId(newId);
    } else if (tool === 'textbox' && !isOverlay) {
        setIsDrawingContinuous(true); // repurposing for box creation state
        setDrawStart2Pt(coords);
        setCurrentBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
        setSelectedAnnotationId(null);
    } else if (is2PointTool) {
        setIsDrawing2Pt(true);
        setDrawStart2Pt(coords);
        if (tool === 'arrow' || tool === 'line' || tool === 'measurement' || tool === 'callout') {
            setCurrent2PtShape({ startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y });
        } else {
            setCurrent2PtShape({ x: coords.x, y: coords.y, w: 0, h: 0 });
        }
        setSelectedAnnotationId(null);
    } else if (tool === 'stamp') {
        addAnnotation({
            id: uuidv4(), type: 'stamp', pageNumber,
            text: stampText, x: coords.x, y: coords.y,
            width: stampWidth, height: stampWidth * 0.32,
            rotation: stampRotation, color: strokeColor, opacity,
            createdDate: new Date().toISOString(), visibility: true,
        });
    } else if (tool === 'sticky') {
        const newId = uuidv4();
        addAnnotation({
            id: newId, type: 'sticky', pageNumber, x: coords.x, y: coords.y,
            text: '', iconType, color: strokeColor, opacity,
            createdDate: new Date().toISOString(), visibility: true,
        });
        setSelectedAnnotationId(newId);
    } else if (isMultiPointTool) {
        if (!isDrawingMPt) {
            setIsDrawingMPt(true);
            setCurrentVertices([coords]);
            setCurrentMousePos(coords);
            setSelectedAnnotationId(null);
        } else {
            setCurrentVertices(prev => [...prev, coords]);
        }
    }
  };

  const handleFinishDrawingM = () => {
      if (isDrawingMPt) {
          const minLength = (tool === 'polygon' || tool === 'cloud' || tool === 'area') ? 3 : 2;
          if (currentVertices.length >= minLength) {
            const newId = uuidv4();
            const ann = {
              id: newId, type: tool, pageNumber, vertices: [...currentVertices],
              strokeColor, borderWidth, opacity,
              createdDate: new Date().toISOString(), visibility: true,
            };
            if (['polygon', 'cloud', 'area'].includes(tool)) ann.fillColor = fillColor;
            if (['polygon', 'polyline'].includes(tool)) {
                ann.borderStyle = borderStyle;
                ann.joinStyle = joinStyle;
            }
            if (tool === 'cloud') ann.cloudRadius = cloudRadius;
            if (['distance', 'area'].includes(tool)) {
                ann.unit = unit; ann.precision = precision;
            }
            addAnnotation(ann);
            setSelectedAnnotationId(newId);
          }
          setIsDrawingMPt(false);
          setCurrentVertices([]);
          setCurrentMousePos(null);
      }
  };

  const handleDoubleClick = (e) => {
    if (isMultiPointTool) handleFinishDrawingM();
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      setDraggingAnnId(ann.id);
      
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setIsDraggingWhole(true);
      
      if (ann.type === 'ink' || ann.type === 'pencil') {
          setDragOffsetWhole({ x: coords.x - ann.points[0][0], y: coords.y - ann.points[0][1] });
      } else if (ann.type === 'freetext' || ann.type === 'textbox') {
          setDragOffsetWhole({ x: coords.x - ann.x, y: coords.y - ann.y });
          e.preventDefault(); 
      } else if (['arrow', 'line', 'measurement', 'callout'].includes(ann.type)) {
          setDragOffsetWhole({ x: coords.x - ann.startX, y: coords.y - ann.startY });
      } else if (['rectangle', 'ellipse', 'stamp', 'sticky', 'stickynote'].includes(ann.type)) {
          setDragOffsetWhole({ x: coords.x - ann.x, y: coords.y - ann.y });
      } else if (['polygon', 'polyline', 'cloud', 'distance', 'area'].includes(ann.type)) {
          setDragOffsetWhole(coords);
          setDragStartVertices(ann.vertices.map(v => ({...v})));
      }
    }
  };

  const handleResizeStartPointerDown = (e, ann) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); setIsResizingStart(true); };
  const handleResizeEndPointerDown = (e, ann) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); setIsResizingEnd(true); };
  const handleResizeBoxPointerDown = (e, ann) => {
    e.stopPropagation();
    setSelectedAnnotationId(ann.id);
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    setIsResizingBox(true);
    setDrawStart2Pt(coords);
    setResizeStartSize({ w: ann.w, h: ann.h });
  };
  const handleResizeVertexPointerDown = (e, ann, index) => { e.stopPropagation(); setSelectedAnnotationId(ann.id); setResizingVertexIndex(index); };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);

      if (isDrawingContinuous) {
          if (tool === 'pencil' || tool === 'ink') {
              if (currentStroke) {
                  const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
                  setCurrentStroke((prev) => ({ ...prev, points: [...prev.points, [coords.x, coords.y, pressure]] }));
              }
          } else if (tool === 'textbox' && drawStart2Pt) {
              const minX = Math.min(drawStart2Pt.x, coords.x);
              const minY = Math.min(drawStart2Pt.y, coords.y);
              const w = Math.abs(coords.x - drawStart2Pt.x);
              const h = Math.abs(coords.y - drawStart2Pt.y);
              setCurrentBox({ x: minX, y: minY, w, h });
          }
      } else if (isDrawing2Pt && drawStart2Pt && current2PtShape) {
          if (tool === 'arrow' || tool === 'line' || tool === 'measurement' || tool === 'callout') {
              setCurrent2PtShape({ ...current2PtShape, endX: coords.x, endY: coords.y });
          } else if (tool === 'rectangle' || tool === 'ellipse') {
              const minX = Math.min(drawStart2Pt.x, coords.x);
              const minY = Math.min(drawStart2Pt.y, coords.y);
              const w = Math.abs(coords.x - drawStart2Pt.x);
              const h = Math.abs(coords.y - drawStart2Pt.y);
              setCurrent2PtShape({ x: minX, y: minY, w, h });
          }
      } else if (isDrawingMPt) {
          setCurrentMousePos(coords);
      } else if (isDraggingWhole && draggingAnnId) {
          const ann = annotations.find(a => a.id === draggingAnnId);
          if (ann) {
              if (ann.type === 'ink' || ann.type === 'pencil') {
                  const dx = coords.x - dragOffsetWhole.x - ann.points[0][0];
                  const dy = coords.y - dragOffsetWhole.y - ann.points[0][1];
                  const newPoints = ann.points.map(p => [p[0] + dx, p[1] + dy, p[2]]);
                  updateAnnotation(draggingAnnId, { points: newPoints });
              } else if (ann.type === 'freetext' || ann.type === 'textbox') {
                  updateAnnotation(draggingAnnId, { x: coords.x - dragOffsetWhole.x, y: coords.y - dragOffsetWhole.y });
              } else if (['arrow', 'line', 'measurement', 'callout'].includes(ann.type)) {
                  const dx = (coords.x - dragOffsetWhole.x) - ann.startX;
                  const dy = (coords.y - dragOffsetWhole.y) - ann.startY;
                  updateAnnotation(draggingAnnId, { startX: ann.startX + dx, startY: ann.startY + dy, endX: ann.endX + dx, endY: ann.endY + dy });
              } else if (['rectangle', 'ellipse', 'stamp', 'sticky', 'stickynote'].includes(ann.type)) {
                  updateAnnotation(draggingAnnId, { x: coords.x - dragOffsetWhole.x, y: coords.y - dragOffsetWhole.y });
              } else if (['polygon', 'polyline', 'cloud', 'distance', 'area'].includes(ann.type)) {
                  const dx = coords.x - dragOffsetWhole.x;
                  const dy = coords.y - dragOffsetWhole.y;
                  const newVertices = dragStartVertices.map(v => ({ x: v.x + dx, y: v.y + dy }));
                  updateAnnotation(draggingAnnId, { vertices: newVertices });
              }
          }
      } else if (isDraggingWhole && selectedAnnotationId && !draggingAnnId) {
          // fallback dragging for legacy or markup (handled by Layer if needed, but we don't drag markups here ideally)
      } else if (selectedAnnotationId) {
          if (isResizingStart) {
              updateAnnotation(selectedAnnotationId, { startX: coords.x, startY: coords.y });
          } else if (isResizingEnd) {
              updateAnnotation(selectedAnnotationId, { endX: coords.x, endY: coords.y });
          } else if (isResizingBox && drawStart2Pt && resizeStartSize) {
              const dx = coords.x - drawStart2Pt.x;
              const dy = coords.y - drawStart2Pt.y;
              updateAnnotation(selectedAnnotationId, {
                  w: Math.max(20, resizeStartSize.w + dx),
                  h: Math.max(20, resizeStartSize.h + dy)
              });
          } else if (resizingVertexIndex !== null) {
              const ann = annotations.find(a => a.id === selectedAnnotationId);
              if (ann && ann.vertices) {
                  const newVertices = [...ann.vertices];
                  newVertices[resizingVertexIndex] = coords;
                  updateAnnotation(selectedAnnotationId, { vertices: newVertices });
              }
          }
      }
    };

    const handlePointerUp = () => {
      if (isDrawingContinuous) {
          if ((tool === 'pencil' || tool === 'ink') && currentStroke) {
              if (currentStroke.points.length > 1) addAnnotation(currentStroke);
              setCurrentStroke(null);
          } else if (tool === 'textbox' && currentBox) {
              if (currentBox.w > 20 && currentBox.h > 20) {
                  const newId = uuidv4();
                  addAnnotation({
                      id: newId, type: 'textbox', pageNumber,
                      x: currentBox.x, y: currentBox.y, w: currentBox.w, h: currentBox.h,
                      text: '', textColor, bgColor: fillColor, borderColor: strokeColor, borderWidth, fontSize, opacity,
                      createdDate: new Date().toISOString(), visibility: true,
                  });
                  setSelectedAnnotationId(newId);
              }
              setCurrentBox(null);
              setDrawStart2Pt(null);
          }
          setIsDrawingContinuous(false);
      }
      
      if (isDrawing2Pt && current2PtShape) {
        let valid = false;
        if (tool === 'arrow' || tool === 'line' || tool === 'measurement' || tool === 'callout') {
            const dx = current2PtShape.endX - current2PtShape.startX;
            const dy = current2PtShape.endY - current2PtShape.startY;
            valid = Math.sqrt(dx * dx + dy * dy) > 10;
        } else {
            valid = current2PtShape.w > 5 && current2PtShape.h > 5;
        }

        if (valid) {
            const newId = uuidv4();
            const baseAnn = {
                id: newId, type: tool, pageNumber, strokeColor, opacity,
                createdDate: new Date().toISOString(), visibility: true,
            };
            if (['arrow', 'line', 'measurement', 'callout'].includes(tool)) {
                baseAnn.startX = current2PtShape.startX; baseAnn.startY = current2PtShape.startY;
                baseAnn.endX = current2PtShape.endX; baseAnn.endY = current2PtShape.endY;
                if (tool === 'arrow' || tool === 'callout') { baseAnn.width = borderWidth; baseAnn.color = strokeColor; }
                if (tool === 'measurement') { baseAnn.unit = unit; baseAnn.precision = precision; }
                if (tool === 'callout') { baseAnn.text = calloutText; }
                if (tool !== 'callout') baseAnn.borderWidth = borderWidth;
            } else {
                baseAnn.x = current2PtShape.x; baseAnn.y = current2PtShape.y;
                baseAnn.w = current2PtShape.w; baseAnn.h = current2PtShape.h;
                baseAnn.borderWidth = borderWidth; baseAnn.bgColor = fillColor;
            }
            addAnnotation(baseAnn);
            setSelectedAnnotationId(newId);
        }
      }
      
      setIsDrawing2Pt(false);
      setDrawStart2Pt(null);
      setCurrent2PtShape(null);
      
      setIsDraggingWhole(false);
      setDraggingAnnId(null);
      setIsResizingStart(false);
      setIsResizingEnd(false);
      setIsResizingBox(false);
      setResizeStartSize(null);
      setResizingVertexIndex(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && isDrawingMPt) {
            handleFinishDrawingM();
        } else if (e.key === 'Escape' && isDrawingMPt) {
            setIsDrawingMPt(false); setCurrentVertices([]); setCurrentMousePos(null);
        }
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isDrawingContinuous, currentStroke, currentBox,
    isDrawing2Pt, drawStart2Pt, current2PtShape, 
    isDrawingMPt, currentVertices,
    isDraggingWhole, dragOffsetWhole, dragStartVertices, draggingAnnId,
    isResizingStart, isResizingEnd, isResizingBox, resizeStartSize, resizingVertexIndex,
    selectedAnnotationId,
    getCanvasCoordinates, addAnnotation, updateAnnotation, annotations,
    pageNumber, strokeColor, fillColor, borderWidth, opacity, tool, borderStyle, joinStyle, cloudRadius, unit, precision,
    textColor, fontSize, calloutText, stampText, stampWidth, stampRotation, iconType
  ]);

  const allAnnotations = currentStroke ? [...annotations, currentStroke] : annotations;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 overflow-hidden ${
        isMarkup && tool !== 'select' ? 'pointer-events-none' : 
        (tool === 'select' ? 'pointer-events-auto cursor-default' : 
        (tool === 'freetext' ? 'pointer-events-auto cursor-text' : 'pointer-events-auto cursor-crosshair'))
      }`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
    >
      <svg
        className="w-full h-full absolute inset-0 z-10"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
          pointerEvents: (isMarkup && tool !== 'select') ? 'none' : 'auto'
        }}
      >
        <defs>
          <marker id="measurement-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>

        <AnnotationLayer 
          annotations={(typeof allAnnotations !== 'undefined' ? allAnnotations : annotations).filter(a => a.pageNumber === pageNumber)}
          zoom={zoom}
          selectedAnnotationId={selectedAnnotationId}
          tool={tool}
          handleAnnotationPointerDown={handleAnnotationPointerDown}
          
          handleResizePointerDown={handleResizeBoxPointerDown} 
          handleResizeStartPointerDown={handleResizeStartPointerDown}
          handleResizeEndPointerDown={handleResizeEndPointerDown}
          handleResizeBoxPointerDown={handleResizeBoxPointerDown}
          handleResizeVertexPointerDown={handleResizeVertexPointerDown}
          
          pixelsPerInch={typeof pixelsPerInch !== 'undefined' ? pixelsPerInch : 72}
        />

        {/* Draw 2-Point Previews */}
        {isDrawing2Pt && current2PtShape && (
          <>
            {(tool === 'arrow') && (() => {
              const { p1, p2, p3, shaftEndX, shaftEndY } = getArrowHeadPoints(current2PtShape.startX, current2PtShape.startY, current2PtShape.endX, current2PtShape.endY, borderWidth);
              return (
                <g opacity={opacity}>
                  <line x1={current2PtShape.startX} y1={current2PtShape.startY} x2={shaftEndX} y2={shaftEndY} stroke={strokeColor} strokeWidth={borderWidth / zoom} />
                  <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={strokeColor} />
                </g>
              );
            })()}
            {tool === 'line' && (
              <line x1={current2PtShape.startX} y1={current2PtShape.startY} x2={current2PtShape.endX} y2={current2PtShape.endY} stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} strokeLinecap="round" />
            )}
            {tool === 'rectangle' && (
              <rect x={current2PtShape.x} y={current2PtShape.y} width={current2PtShape.w} height={current2PtShape.h} fill={fillColor === 'transparent' ? 'transparent' : fillColor} stroke={strokeColor === 'transparent' ? 'transparent' : strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} />
            )}
            {tool === 'ellipse' && (
              <ellipse cx={current2PtShape.x + current2PtShape.w / 2} cy={current2PtShape.y + current2PtShape.h / 2} rx={current2PtShape.w / 2} ry={current2PtShape.h / 2} fill={fillColor === 'transparent' ? 'transparent' : fillColor} stroke={strokeColor === 'transparent' ? 'transparent' : strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} />
            )}
            {tool === 'measurement' && (
              <g opacity={opacity}>
                  <line
                      x1={current2PtShape.startX} y1={current2PtShape.startY}
                      x2={current2PtShape.endX} y2={current2PtShape.endY}
                      stroke={strokeColor} strokeWidth={borderWidth / zoom}
                      markerStart="url(#measurement-arrow)" markerEnd="url(#measurement-arrow)"
                  />
                  {renderMeasurementLabelText(
                      current2PtShape.startX, current2PtShape.startY, 
                      current2PtShape.endX, current2PtShape.endY, 
                      formatMeasurement(calculateDistance(current2PtShape.startX, current2PtShape.startY, current2PtShape.endX, current2PtShape.endY), pixelsPerInch, unit, precision),
                      zoom, strokeColor
                  )}
              </g>
            )}
            {tool === 'callout' && (() => {
              const previewText = calloutText || '';
              const previewWidth = strokeWidth;
              const { p1, p2, p3, shaftStartX, shaftStartY } = getCalloutArrowPoints(
                current2PtShape.startX, current2PtShape.startY,
                current2PtShape.endX, current2PtShape.endY, previewWidth
              );
              const fontSize = 16 + previewWidth;
              const textPadding = 12;
              const approxTextWidth = (previewText.length * fontSize * 0.6) + textPadding * 2;
              const boxWidth = Math.max(80, approxTextWidth);
              const boxHeight = fontSize + textPadding * 2;
              let boxX = current2PtShape.endX;
              let boxY = current2PtShape.endY - boxHeight / 2;
              if (current2PtShape.startX > current2PtShape.endX) boxX = current2PtShape.endX - boxWidth;
              return (
                <g opacity={opacity}>
                  <line x1={shaftStartX} y1={shaftStartY} x2={current2PtShape.endX} y2={current2PtShape.endY} stroke={strokeColor} strokeWidth={previewWidth} strokeDasharray="6 3" />
                  <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={strokeColor} />
                  <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} fill="white" stroke={strokeColor} strokeWidth={previewWidth} rx={6} strokeDasharray="6 3" />
                  <text x={boxX + boxWidth / 2} y={boxY + boxHeight / 2} fill={strokeColor} fontSize={fontSize} fontWeight="bold" fontFamily="sans-serif" textAnchor="middle" dominantBaseline="central" style={{ userSelect: 'none' }}>{previewText}</text>
                </g>
              );
            })()}
          </>
        )}

        {/* Draw Multi-Point Previews */}
        {isDrawingMPt && currentVertices.length > 0 && (
          <>
            {tool === 'polygon' && (
              <polygon points={renderPolygonOrPolyline(currentVertices, currentMousePos)} fill={fillColor === 'transparent' ? 'none' : fillColor} stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} strokeLinejoin={joinStyle} strokeDasharray={getStrokeDashArray(borderStyle, borderWidth, zoom)} />
            )}
            {tool === 'polyline' && (
              <polyline points={renderPolygonOrPolyline(currentVertices, currentMousePos)} fill="none" stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} strokeLinejoin={joinStyle} strokeDasharray={getStrokeDashArray(borderStyle, borderWidth, zoom)} />
            )}
            {tool === 'cloud' && (
              <path d={generateCloudPath(currentVertices, currentMousePos, cloudRadius)} fill={fillColor === 'transparent' ? 'none' : fillColor} stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} strokeLinejoin="round" />
            )}
            {tool === 'distance' && (
                <>
                    <polyline
                        points={renderPolygonOrPolyline(currentVertices, currentMousePos)}
                        fill="none" stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity}
                        strokeLinejoin="round" strokeLinecap="round"
                    />
                    {currentVertices.length > 0 && currentMousePos && renderDistanceLabelText(
                        [...currentVertices, currentMousePos], 
                        calculateTotalDistancePx([...currentVertices, currentMousePos]), 
                        pixelsPerInch, unit, precision, strokeColor, zoom
                    )}
                </>
            )}
            {tool === 'area' && (
                <>
                    <polygon
                        points={renderPolygonOrPolyline(currentVertices, currentMousePos)}
                        fill={fillColor === 'transparent' ? 'none' : fillColor}
                        stroke={strokeColor} strokeWidth={borderWidth / zoom} opacity={opacity} strokeLinejoin="round"
                    />
                    {currentVertices.length > 1 && renderAreaLabelText(
                        [...currentVertices, currentMousePos], 
                        calculatePolygonAreaPx([...currentVertices, currentMousePos]), 
                        pixelsPerInch, unit, precision, strokeColor, zoom
                    )}
                </>
            )}
          </>
        )}
      </svg>

      {isDrawingContinuous && tool === 'textbox' && currentBox && (
        <div 
          className="absolute border-2 border-blue-500 border-dashed bg-blue-100 bg-opacity-20 z-40 pointer-events-none"
          style={{
            left: `${currentBox.x * zoom + pan.x}px`, top: `${currentBox.y * zoom + pan.y}px`,
            width: `${currentBox.w * zoom}px`, height: `${currentBox.h * zoom}px`,
          }}
        />
      )}

      {/* HTML OVERLAY for sticky popups */}
      {annotations.filter(ann => ann.visibility && ann.pageNumber === pageNumber && selectedAnnotationId === ann.id && (ann.type === 'sticky' || ann.type === 'stickynote')).map((ann) => {
        const popupLeft = (ann.x * zoom) + pan.x + 16;
        const popupTop = (ann.y * zoom) + pan.y + 16;
        
        return (
          <div 
            key={`popup-${ann.id}`}
            className="sticky-popup absolute bg-white shadow-2xl border border-gray-200 rounded-xl flex flex-col z-50 w-64 animate-in fade-in zoom-in duration-200"
            style={{ 
              left: `${popupLeft}px`, 
              top: `${popupTop}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()} 
          >
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center gap-2">
                {React.createElement(ICON_MAP[ann.iconType] || MessageSquare, { size: 14, color: ann.color })}
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{ann.iconType} Note</span>
              </div>
              <button 
                onClick={() => setSelectedAnnotationId(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle size={16} />
              </button>
            </div>
            <textarea
              autoFocus
              value={ann.text}
              onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
              placeholder="Type your comment here..."
              className="w-full h-32 p-3 text-sm text-gray-800 bg-transparent outline-none resize-none"
            />
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end">
              <span className="text-[10px] text-gray-400">Will be printed on PDF</span>
            </div>
          </div>
        )
      })}
    </div>
  );
}

// ==========================================
// RENDERERS - TEXT & MARKUPS
// ==========================================

export function HighlightToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'highlight') {
    return (
      <g key={ann.id} className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}>
        {ann.rects.map((r, i) => (
          <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={ann.color} opacity={ann.opacity} style={{ mixBlendMode: 'multiply' }} />
        ))}
        {isSelected && ann.rects.length > 0 && (
          <g>
            {ann.rects.map((r, i) => (
              <rect key={`sel_${i}`} x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" />
            ))}
          </g>
        )}
      </g>
    );
  }
  return null;
}

export function UnderlineToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'underline') {
    return (
      <g key={ann.id} className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}>
        {ann.rects.map((r, i) => {
          const lineY = r.y + r.h + 2;
          if (ann.underlineStyle === 'double') {
            return (
              <g key={i}>
                <line x1={r.x} y1={lineY} x2={r.x + r.w} y2={lineY} stroke={ann.color} strokeWidth={ann.width} opacity={ann.opacity} />
                <line x1={r.x} y1={lineY + ann.width * 2} x2={r.x + r.w} y2={lineY + ann.width * 2} stroke={ann.color} strokeWidth={ann.width} opacity={ann.opacity} />
              </g>
            );
          }
          const strokeDasharray = ann.underlineStyle === 'dashed' ? '6 4' : ann.underlineStyle === 'dotted' ? '2 4' : 'none';
          const strokeLinecap = ann.underlineStyle === 'dotted' ? 'round' : 'butt';
          return (
            <line key={i} x1={r.x} y1={lineY} x2={r.x + r.w} y2={lineY} stroke={ann.color} strokeWidth={ann.width} strokeDasharray={strokeDasharray} strokeLinecap={strokeLinecap} opacity={ann.opacity} />
          );
        })}
        {ann.rects.map((r, i) => <rect key={`hit_${i}`} x={r.x} y={r.y} width={r.w} height={r.h + 10} fill="transparent" />)}
        {isSelected && ann.rects.length > 0 && (
          <g>
            {ann.rects.map((r, i) => <rect key={`sel_${i}`} x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 10 + ann.width * 2} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" />)}
          </g>
        )}
      </g>
    );
  }
  return null;
}

export function StrikeoutToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'strikeout') {
    return (
      <g key={ann.id} className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}>
        {ann.rects.map((r, i) => {
          const lineY = r.y + r.h / 2;
          if (ann.strikeoutStyle === 'double') {
            return (
              <g key={i}>
                <line x1={r.x} y1={lineY - Math.max(2, ann.width)} x2={r.x + r.w} y2={lineY - Math.max(2, ann.width)} stroke={ann.color} strokeWidth={ann.width} opacity={ann.opacity} />
                <line x1={r.x} y1={lineY + Math.max(2, ann.width)} x2={r.x + r.w} y2={lineY + Math.max(2, ann.width)} stroke={ann.color} strokeWidth={ann.width} opacity={ann.opacity} />
              </g>
            );
          }
          const strokeDasharray = ann.strikeoutStyle === 'dashed' ? '6 4' : ann.strikeoutStyle === 'dotted' ? '2 4' : 'none';
          const strokeLinecap = ann.strikeoutStyle === 'dotted' ? 'round' : 'butt';
          return (
            <line key={i} x1={r.x} y1={lineY} x2={r.x + r.w} y2={lineY} stroke={ann.color} strokeWidth={ann.width} strokeDasharray={strokeDasharray} strokeLinecap={strokeLinecap} opacity={ann.opacity} />
          );
        })}
        {ann.rects.map((r, i) => <rect key={`hit_${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="transparent" />)}
        {isSelected && ann.rects.length > 0 && (
          <g>
            {ann.rects.map((r, i) => <rect key={`sel_${i}`} x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" />)}
          </g>
        )}
      </g>
    );
  }
  return null;
}

export function SquigglyToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'squiggly') {
    return (
      <g key={ann.id} className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}>
        {ann.rects.map((r, i) => {
          const lineY = r.y + r.h + 3;
          const pathData = getSquigglyPath(r.x, lineY, r.w, ann.waveStyle);
          return (
            <path key={i} d={pathData} fill="none" stroke={ann.color} strokeWidth={ann.width} opacity={ann.opacity} strokeLinecap="round" strokeLinejoin="round" />
          );
        })}
        {ann.rects.map((r, i) => <rect key={`hit_${i}`} x={r.x} y={r.y} width={r.w} height={r.h + 10} fill="transparent" />)}
        {isSelected && ann.rects.length > 0 && (
          <g>
            {ann.rects.map((r, i) => <rect key={`sel_${i}`} x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 10 + ann.width * 2} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" />)}
          </g>
        )}
      </g>
    );
  }
  return null;
}

export function PencilToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'pencil') {
    const strokeOptions = {
      size: ann.width, thinning: 0.5, smoothing: 0.5, streamline: 0.5,
      simulatePressure: ann.points[0] && ann.points[0].length === 3,
    };
    const strokePath = getSvgPathFromStroke(getStroke(ann.points, strokeOptions));
    return (
      <path
        key={ann.id} d={strokePath} fill={ann.color} opacity={ann.opacity}
        className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`}
        onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
        style={{ stroke: isSelected ? '#3b82f6' : 'transparent', strokeWidth: isSelected ? 2 / zoom : 0 }}
      />
    );
  }
  return null;
}

export function InkToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type === 'ink') {
    const profile = PEN_PROFILES[ann.penStyle] || PEN_PROFILES['ballpoint'];
    const strokeData = getStroke(ann.points, { ...profile, size: ann.width * (ann.penStyle === 'marker' ? 2 : 1) });
    const pathData = getSvgPathFromStroke(strokeData);
    let actualOpacity = ann.opacity;
    if (ann.penStyle === 'marker') actualOpacity = Math.min(ann.opacity, 0.6); 
    return (
      <g key={ann.id} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}>
        <path d={pathData} fill={ann.color} opacity={actualOpacity} />
        <path d={pathData} fill="transparent" stroke="transparent" strokeWidth={Math.max(20, ann.width * 2)} />
        {isSelected && <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" opacity="0.8" />}
      </g>
    );
  }
  return null;
}

export function FreeTextToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, updateAnnotation }) {
  if (ann.type === 'freetext') {
    return (
      <foreignObject
        x={ann.x} y={ann.y} width={ann.w} height={ann.h}
        className={`freetext-overlay pointer-events-auto ${isSelected ? 'ring-1 ring-blue-400 ring-dashed overflow-visible' : ''}`}
        onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
      >
        <div className="w-full h-full relative" xmlns="http://www.w3.org/1999/xhtml">
          {isSelected && (
            <div className="absolute -top-6 left-[-1px] bg-blue-500 text-white rounded-t px-2 py-0.5 text-[10px] uppercase font-bold cursor-move shadow-md opacity-90 hover:opacity-100 z-50 flex items-center">Move</div>
          )}
          <textarea
            value={ann.text}
            onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
            placeholder="Type text here..."
            className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden m-0 p-0 leading-tight"
            style={{ color: ann.textColor, fontSize: `${ann.fontSize / zoom}px`, opacity: ann.opacity, fontFamily: 'sans-serif' }}
            onPointerDown={(e) => { if (tool !== 'select') e.stopPropagation(); }}
          />
          {isSelected && tool === 'select' && (
            <div 
              className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize shadow-md border-2 border-white resize-handle"
              onPointerDown={(e) => handleResizePointerDown && handleResizePointerDown(e, ann)}
            />
          )}
        </div>
      </foreignObject>
    );
  }
  return null;
}

export function TextBoxToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, updateAnnotation }) {
  if (ann.type === 'textbox') {
    return (
      <foreignObject
        x={ann.x} y={ann.y} width={ann.w} height={ann.h}
        className={`textbox-overlay pointer-events-auto ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 overflow-visible' : ''}`}
        onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
      >
        <div 
          className="w-full h-full relative flex" 
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            backgroundColor: ann.bgColor !== 'transparent' ? ann.bgColor : 'transparent',
            border: `${ann.borderWidth / zoom}px solid ${ann.borderColor !== 'transparent' ? ann.borderColor : 'transparent'}`,
            opacity: ann.opacity
          }}
        >
          {isSelected && (
            <div className="absolute -top-6 left-[-1px] bg-blue-500 text-white rounded-t px-2 py-0.5 text-[10px] uppercase font-bold cursor-move shadow-md z-50">Move</div>
          )}
          <textarea
            value={ann.text}
            onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
            placeholder="Text Box"
            className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden m-0 p-2 leading-tight placeholder-gray-400"
            style={{ color: ann.textColor, fontSize: `${ann.fontSize / zoom}px`, fontFamily: 'sans-serif' }}
            onPointerDown={(e) => { if (tool !== 'select') e.stopPropagation(); }}
          />
          {isSelected && tool === 'select' && (
            <div 
              className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize shadow-md border-2 border-white resize-handle"
              onPointerDown={(e) => handleResizePointerDown && handleResizePointerDown(e, ann)}
            />
          )}
        </div>
      </foreignObject>
    );
  }
  return null;
}

// ==========================================
// RENDERERS - SHAPES
// ==========================================

export function ArrowToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeStartPointerDown, handleResizeEndPointerDown }) {
    if (ann.type !== 'arrow') return null;
    const { p1, p2, p3, shaftEndX, shaftEndY } = getArrowHeadPoints(ann.startX, ann.startY, ann.endX, ann.endY, ann.width || ann.borderWidth);
    return (
        <g key={ann.id} opacity={ann.opacity}>
        <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke="transparent" strokeWidth={Math.max(20 / zoom, (ann.width || ann.borderWidth) / zoom + 10)} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <line x1={ann.startX} y1={ann.startY} x2={shaftEndX} y2={shaftEndY} stroke={ann.color || ann.strokeColor} strokeWidth={(ann.width || ann.borderWidth) / zoom} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={ann.color || ann.strokeColor} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {isSelected && tool === 'select' && (
            <>
                <circle cx={ann.startX} cy={ann.startY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeStartPointerDown && handleResizeStartPointerDown(e, ann)} />
                <circle cx={ann.endX} cy={ann.endY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeEndPointerDown && handleResizeEndPointerDown(e, ann)} />
            </>
        )}
        </g>
    );
}

export function LineToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeStartPointerDown, handleResizeEndPointerDown }) {
    if (ann.type !== 'line') return null;
    return (
        <g key={ann.id}>
        <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} strokeLinecap="round" className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {isSelected && tool === 'select' && (
            <>
                <circle cx={ann.startX} cy={ann.startY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeStartPointerDown && handleResizeStartPointerDown(e, ann)} />
                <circle cx={ann.endX} cy={ann.endY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeEndPointerDown && handleResizeEndPointerDown(e, ann)} />
            </>
        )}
        </g>
    );
}

export function RectangleToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeBoxPointerDown }) {
    if (ann.type !== 'rectangle') return null;
    return (
        <g key={ann.id}>
        <rect x={ann.x} y={ann.y} width={ann.w} height={ann.h} fill={ann.bgColor === 'transparent' ? 'transparent' : ann.bgColor} stroke={ann.strokeColor === 'transparent' ? 'transparent' : ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {ann.bgColor === 'transparent' && (
            <rect x={ann.x - 5/zoom} y={ann.y - 5/zoom} width={ann.w + 10/zoom} height={ann.h + 10/zoom} fill="transparent" stroke="transparent" className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        )}
        {isSelected && (
            <rect x={ann.x - 2/zoom} y={ann.y - 2/zoom} width={ann.w + 4/zoom} height={ann.h + 4/zoom} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray={`${4/zoom},${4/zoom}`} className="pointer-events-none" />
        )}
        {isSelected && tool === 'select' && (
            <circle cx={ann.x + ann.w} cy={ann.y + ann.h} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-se-resize" onPointerDown={(e) => handleResizeBoxPointerDown && handleResizeBoxPointerDown(e, ann)} />
        )}
        </g>
    );
}

export function EllipseToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeBoxPointerDown }) {
    if (ann.type !== 'ellipse') return null;
    const cx = ann.x + ann.w / 2;
    const cy = ann.y + ann.h / 2;
    const rx = ann.w / 2;
    const ry = ann.h / 2;
    return (
        <g key={ann.id}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={ann.bgColor === 'transparent' ? 'transparent' : ann.bgColor} stroke={ann.strokeColor === 'transparent' ? 'transparent' : ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {ann.bgColor === 'transparent' && (
            <ellipse cx={cx} cy={cy} rx={rx + 5/zoom} ry={ry + 5/zoom} fill="transparent" stroke="transparent" className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        )}
        {isSelected && (
            <rect x={ann.x - 2/zoom} y={ann.y - 2/zoom} width={ann.w + 4/zoom} height={ann.h + 4/zoom} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray={`${4/zoom},${4/zoom}`} className="pointer-events-none" />
        )}
        {isSelected && tool === 'select' && (
            <circle cx={ann.x + ann.w} cy={ann.y + ann.h} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-se-resize" onPointerDown={(e) => handleResizeBoxPointerDown && handleResizeBoxPointerDown(e, ann)} />
        )}
        </g>
    );
}

export function PolygonToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeVertexPointerDown }) {
    if (ann.type !== 'polygon') return null;
    return (
        <g key={ann.id}>
        <polygon points={renderPolygonOrPolyline(ann.vertices)} fill={ann.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : ann.fillColor} stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)} strokeLinejoin={ann.joinStyle} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <polygon points={renderPolygonOrPolyline(ann.vertices)} fill={ann.fillColor} stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} strokeLinejoin={ann.joinStyle} strokeDasharray={getStrokeDashArray(ann.borderStyle, ann.borderWidth, zoom)} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
            <circle key={idx} cx={v.x} cy={v.y} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeVertexPointerDown && handleResizeVertexPointerDown(e, ann, idx)} />
        ))}
        </g>
    );
}

export function PolylineToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeVertexPointerDown }) {
    if (ann.type !== 'polyline') return null;
    return (
        <g key={ann.id}>
        <polyline points={renderPolygonOrPolyline(ann.vertices)} fill="none" stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)} strokeLinejoin={ann.joinStyle} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <polyline points={renderPolygonOrPolyline(ann.vertices)} fill="none" stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} strokeLinejoin={ann.joinStyle} strokeDasharray={getStrokeDashArray(ann.lineStyle || ann.borderStyle, ann.borderWidth, zoom)} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
            <circle key={idx} cx={v.x} cy={v.y} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeVertexPointerDown && handleResizeVertexPointerDown(e, ann, idx)} />
        ))}
        </g>
    );
}

export function CloudToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeVertexPointerDown }) {
    if (ann.type !== 'cloud') return null;
    const cloudSvgPath = generateCloudPath(ann.vertices, null, ann.cloudRadius);
    return (
        <g key={ann.id}>
        <path d={cloudSvgPath} fill={ann.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : ann.fillColor} stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)} className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        <path d={cloudSvgPath} fill={ann.fillColor === 'transparent' ? 'none' : ann.fillColor} stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom} opacity={ann.opacity} strokeLinejoin="round" className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`} onPointerDown={(e) => handleAnnotationPointerDown(e, ann)} />
        {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
            <circle key={idx} cx={v.x} cy={v.y} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeVertexPointerDown && handleResizeVertexPointerDown(e, ann, idx)} />
        ))}
        </g>
    );
}


// ==========================================
// RENDERERS - MEASUREMENTS
// ==========================================

export const renderMeasurementLabelText = (startX, startY, endX, endY, labelText, zoom, strokeColor) => {
    const cx = (startX + endX) / 2;
    const cy = (startY + endY) / 2;
    let angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
    if (angle > 90 || angle < -90) {
        angle += 180;
    }
    return (
        <text
            x={cx} y={cy - 8 / zoom} fontSize={14 / zoom} fontWeight="bold" fontFamily="sans-serif"
            fill={strokeColor} textAnchor="middle" alignmentBaseline="bottom"
            transform={`rotate(${angle} ${cx} ${cy})`} className="pointer-events-none drop-shadow-md"
            style={{ textShadow: `0px 0px ${4/zoom}px white` }}
        >
            {labelText}
        </text>
    );
};

export const renderDistanceLabelText = (vertices, totalPx, pixelsPerInch, u, prec, color, zoom) => {
    if (vertices.length < 2) return null;
    const lastVertex = vertices[vertices.length - 1];
    const labelText = formatMeasurement(totalPx, pixelsPerInch, u, prec);
    return (
        <g transform={`translate(${lastVertex.x} ${lastVertex.y})`}>
           <rect x={-40/zoom} y={10/zoom} width={80/zoom} height={20/zoom} rx={4/zoom} fill="white" opacity="0.8" className="pointer-events-none" />
           <text
               x={0} y={24 / zoom} fontSize={12 / zoom} fontWeight="bold" fontFamily="sans-serif"
               fill={color} textAnchor="middle" className="pointer-events-none"
           >
               {labelText}
           </text>
        </g>
    );
};

export const renderAreaLabelText = (vertices, areaPx, pixelsPerInch, u, prec, color, zoom) => {
    if (vertices.length < 3) return null;
    const centroid = getCentroid(vertices);
    const labelText = formatArea(areaPx, pixelsPerInch, u, prec);
    return (
        <text
            x={centroid.x} y={centroid.y} fontSize={14 / zoom} fontWeight="bold" fontFamily="sans-serif"
            fill={color} textAnchor="middle" alignmentBaseline="middle"
            className="pointer-events-none drop-shadow-md" style={{ textShadow: `0px 0px ${4/zoom}px white` }}
        >
            {labelText}
        </text>
    );
}

export function MeasurementToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeStartPointerDown, handleResizeEndPointerDown, pixelsPerInch }) {
    if (ann.type !== 'measurement') return null;
    const distPx = calculateDistance(ann.startX, ann.startY, ann.endX, ann.endY);
    const labelText = formatMeasurement(distPx, pixelsPerInch, ann.unit, ann.precision);

    return (
      <g key={ann.id} opacity={ann.opacity}>
        <line
          x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY}
          stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
          className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
          onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
        />
        <line
          x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY}
          stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom}
          markerStart="url(#measurement-arrow)" markerEnd="url(#measurement-arrow)"
          className="pointer-events-none"
        />
        {renderMeasurementLabelText(ann.startX, ann.startY, ann.endX, ann.endY, labelText, zoom, ann.strokeColor)}
        
        {isSelected && tool === 'select' && (
            <>
                <circle cx={ann.startX} cy={ann.startY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeStartPointerDown && handleResizeStartPointerDown(e, ann)} />
                <circle cx={ann.endX} cy={ann.endY} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeEndPointerDown && handleResizeEndPointerDown(e, ann)} />
            </>
        )}
      </g>
    );
}

export function DistanceToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeVertexPointerDown, pixelsPerInch }) {
    if (ann.type !== 'distance') return null;
    const totalPx = calculateTotalDistancePx(ann.vertices);
    return (
      <g key={ann.id} opacity={ann.opacity}>
        <polyline
          points={renderPolygonOrPolyline(ann.vertices)}
          fill="none" stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
          strokeLinejoin="round" strokeLinecap="round"
          className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
          onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
        />
        <polyline
          points={renderPolygonOrPolyline(ann.vertices)}
          fill="none" stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom}
          strokeLinejoin="round" strokeLinecap="round" className="pointer-events-none"
        />
        {ann.vertices.map((v, i) => (
          <circle key={i} cx={v.x} cy={v.y} r={Math.max(2/zoom, ann.borderWidth/zoom)} fill={ann.strokeColor} className="pointer-events-none" />
        ))}
        {renderDistanceLabelText(ann.vertices, totalPx, pixelsPerInch, ann.unit, ann.precision, ann.strokeColor, zoom)}

        {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
            <circle key={idx} cx={v.x} cy={v.y} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeVertexPointerDown && handleResizeVertexPointerDown(e, ann, idx)} />
        ))}
      </g>
    );
}

export function AreaToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizeVertexPointerDown, pixelsPerInch }) {
    if (ann.type !== 'area') return null;
    const areaPx = calculatePolygonAreaPx(ann.vertices);
    return (
      <g key={ann.id} opacity={ann.opacity}>
        <polygon
          points={renderPolygonOrPolyline(ann.vertices)}
          fill={ann.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : ann.fillColor} stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
          strokeLinejoin="round"
          className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
          onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
        />
        <polygon
          points={renderPolygonOrPolyline(ann.vertices)}
          fill={ann.fillColor} stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom}
          strokeLinejoin="round" className="pointer-events-none"
        />
        {ann.vertices.map((v, i) => (
          <circle key={i} cx={v.x} cy={v.y} r={Math.max(2/zoom, ann.borderWidth/zoom)} fill={ann.strokeColor} className="pointer-events-none" />
        ))}
        {renderAreaLabelText(ann.vertices, areaPx, pixelsPerInch, ann.unit, ann.precision, ann.strokeColor, zoom)}

        {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
            <circle key={idx} cx={v.x} cy={v.y} r={6 / zoom} fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom} className="resize-handle pointer-events-auto cursor-move" onPointerDown={(e) => handleResizeVertexPointerDown && handleResizeVertexPointerDown(e, ann, idx)} />
        ))}
      </g>
    );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function DrawAndMarkupTool({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen, setIsPropertiesPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);
  const { setIsHistoryPanelOpen } = useContext(HistoryContext);

  const [tool, setTool] = useState('highlight');
  const [strokeColor, setStrokeColor] = useState('#fef08a');
  const [fillColor, setFillColor] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  
  // Specific settings
  const [underlineStyle, setUnderlineStyle] = useState('solid');
  const [strikeoutStyle, setStrikeoutStyle] = useState('solid');
  const [waveStyle, setWaveStyle] = useState('standard');
  const [penStyle, setPenStyle] = useState('ballpoint');
  const [textColor, setTextColor] = useState('#000000');
  const [fontSize, setFontSize] = useState(16);
  const [borderStyle, setBorderStyle] = useState('solid');
  const [joinStyle, setJoinStyle] = useState('miter');
  const [cloudRadius, setCloudRadius] = useState(15);
  
  const [unit, setUnit] = useState('m');
  const [precision, setPrecision] = useState(2);
  const [pixelsPerInch, setPixelsPerInch] = useState(72);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Stamp state
  const [stampText, setStampText] = useState('APPROVED');
  const [isCustomStamp, setIsCustomStamp] = useState(false);
  const [customStampText, setCustomStampText] = useState('CUSTOM');
  const [stampWidth, setStampWidth] = useState(250);
  const [stampRotation, setStampRotation] = useState(0);

  // Sticky Note state
  const [iconType, setIconType] = useState('Note');

  // Callout state
  const [calloutText, setCalloutText] = useState('');

  const getInitialZoom = () => window.innerWidth < 450 ? 0.6 : window.innerWidth < 768 ? 0.8 : 1;
  const [zoom, setZoom] = useState(getInitialZoom());

  // Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    
  const zoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const resetZoom = () => { setZoom(getInitialZoom()); };

  const onPdfUpload = (event) => {
    const { files } = event.target;
    if (files && files[0]) setFile(files[0]);
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const handleDownloadPdf = async () => {
    await downloadAnnotationsPdf(file, annotations, pixelsPerInch);
  };
  
  // Automatically adjust default colors when switching between tool categories
  useEffect(() => {
    if (['highlight'].includes(tool)) {
      setStrokeColor('#fef08a');
    } else if (['underline', 'strikeout', 'squiggly'].includes(tool)) {
      setStrokeColor('#ef4444');
    } else if (['pencil', 'ink'].includes(tool)) {
      setStrokeColor('#000000');
    } else if (['arrow', 'line', 'rectangle', 'ellipse', 'polygon', 'polyline', 'cloud'].includes(tool)) {
      setStrokeColor('#ef4444');
      setFillColor('transparent');
    } else if (['measurement', 'distance', 'area'].includes(tool)) {
      setStrokeColor('#3b82f6');
      if (tool === 'area') setFillColor('transparent');
    }
  }, [tool]);

  return (
    <div className="w-full min-h-screen flex flex-col relative bg-transparent">
      <div className="w-full shrink-0 z-0">
          <ReviewAnnotationHeader onBack={onBack} />
      </div>


      {/* ─── FLOATING TOOLBARS ─── */}
      <div className="sticky top-2 sm:top-4 mx-auto w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-full z-50 shrink-0 flex flex-col gap-3 pointer-events-none transition-all duration-300">

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ TOP NAVBAR Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shrink-0 shadow-2xl pointer-events-auto overflow-hidden">
        <div className="p-2 sm:px-4 sm:h-14 flex flex-wrap items-center justify-center sm:justify-center gap-2 sm:gap-3">


          {/* Right: action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 w-full sm:w-auto px-1 pb-1 sm:pb-0">
            <button onClick={() => setIsReportModalOpen(true)} className="flex items-center gap-1.5 text-indigo-300 border border-indigo-700 hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg font-medium transition-all text-xs shrink-0">
              <PieChart size={14} /> <span className="hidden md:inline">Summary</span>
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-1.5 text-slate-300 border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-all text-xs">
              <DownloadCloud size={14} /> <span className="hidden md:inline">Export</span>
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-1.5 text-slate-300 border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-all text-xs">
              <UploadCloud size={14} /> <span className="hidden md:inline">Import</span>
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <button onClick={() => setIsPropertiesPanelOpen(prev => !prev)} className="flex items-center gap-1.5 text-slate-300 border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-all text-xs">
              <Sliders size={14} /> <span className="hidden md:inline">Properties</span>
            </button>
            <button onClick={() => setIsHistoryPanelOpen(prev => !prev)} className="flex items-center gap-1.5 text-slate-300 border border-slate-600 hover:bg-slate-700 px-3 py-1.5 rounded-lg font-medium transition-all text-xs">
              <History size={14} /> <span className="hidden md:inline">Audit Trail</span>
            </button>
            <button onClick={() => setIsCommentPanelOpen(prev => !prev)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium transition-all text-xs">
              <MessageSquare size={14} /> <span className="hidden md:inline">Comments</span>
              <span className="bg-blue-800/60 px-1.5 py-0.5 rounded-full text-[10px] ml-0.5">{annotations.length}</span>
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <label className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium cursor-pointer transition-all text-xs">
              <Upload size={14} /> <span className="hidden md:inline">Upload PDF</span>
              <input type="file" accept="application/pdf" onChange={onPdfUpload} className="hidden" />
            </label>
            <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-medium transition-all text-xs shrink-0">
              <Download size={14} /> <span className="hidden md:inline">Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Ã¢â€â‚¬Ã¢â€â‚¬ ANNOTATION TOOLBAR Ã¢â€â‚¬Ã¢â€â‚¬ */}
      <Toolbar 
        tool={tool} setTool={setTool} strokeColor={strokeColor} setStrokeColor={setStrokeColor}
        fillColor={fillColor} setFillColor={setFillColor}
        underlineStyle={underlineStyle} setUnderlineStyle={setUnderlineStyle}
        strikeoutStyle={strikeoutStyle} setStrikeoutStyle={setStrikeoutStyle}
        waveStyle={waveStyle} setWaveStyle={setWaveStyle}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        penStyle={penStyle} setPenStyle={setPenStyle}
        textColor={textColor} setTextColor={setTextColor}
        borderStyle={borderStyle} setBorderStyle={setBorderStyle}
        joinStyle={joinStyle} setJoinStyle={setJoinStyle}
        cloudRadius={cloudRadius} setCloudRadius={setCloudRadius}
        unit={unit} setUnit={setUnit} precision={precision} setPrecision={setPrecision}
        fontSize={fontSize} setFontSize={setFontSize} opacity={opacity} setOpacity={setOpacity}
        stampText={stampText} setStampText={setStampText}
        isCustomStamp={isCustomStamp} setIsCustomStamp={setIsCustomStamp}
        customStampText={customStampText} setCustomStampText={setCustomStampText}
        stampWidth={stampWidth} setStampWidth={setStampWidth}
        stampRotation={stampRotation} setStampRotation={setStampRotation}
        iconType={iconType} setIconType={setIconType}
        calloutText={calloutText} setCalloutText={setCalloutText}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} updateAnnotation={updateAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
        onPdfUpload={onPdfUpload} onDownloadPdf={handleDownloadPdf} onBack={onBack}
        onOpenCalibration={() => setIsCalibrating(true)} onToggleComments={() => setIsCommentPanelOpen(prev => !prev)}
      />
      </div>

      <div className="w-full flex-1 flex flex-col items-center bg-slate-50/50 z-10 relative mb-12 overflow-y-auto max-h-[75vh] rounded-2xl border border-slate-200/80 shadow-inner" style={{ scrollbarWidth: 'thin' }}>
        <div className={`relative transition-transform origin-top flex flex-col items-center ${!file ? 'w-full min-h-[50vh] justify-start pt-4' : 'pt-8'}`} style={{ transform: !file ? 'none' : `scale(${zoom})` }}>
          {!file ? (
            <div className="w-full max-w-md flex flex-col items-center justify-start p-2 sm:p-4 mt-2">
                  <PdfUploader onFileSelect={(f) => setFile(f)} />
            </div>
          ) : (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={(error) => {
              console.error('PDF load error:', error);
            }}
            loading={
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-10 h-10 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                <span className="text-sm font-medium">Loading PDF…</span>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-red-500" size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 mb-1">Failed to Load PDF</h3>
                  <p className="text-sm text-slate-500 max-w-xs">
                    The PDF could not be rendered. Make sure the file is not password-protected or corrupted.
                  </p>
                </div>
                <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium cursor-pointer transition-all text-sm">
                  <Upload size={16} /> Try another file
                  <input type="file" accept="application/pdf" onChange={onPdfUpload} className="hidden" />
                </label>
              </div>
            }
            className="flex flex-col items-center w-full"
          >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative bg-white shadow-xl mb-8 flex-shrink-0 mx-auto" style={{ width: 'max-content' }}>
                  <Page pageNumber={index + 1} renderTextLayer={true} renderAnnotationLayer={false} />
                  <DrawingBoard
                    pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                    updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                    tool={tool} strokeColor={strokeColor} fillColor={fillColor} 
                    underlineStyle={underlineStyle} strikeoutStyle={strikeoutStyle} waveStyle={waveStyle}
                    strokeWidth={strokeWidth} borderWidth={strokeWidth} penStyle={penStyle} textColor={textColor}
                    borderStyle={borderStyle} joinStyle={joinStyle} cloudRadius={cloudRadius}
                    unit={unit} precision={precision} fontSize={fontSize} opacity={opacity}
                    pixelsPerInch={pixelsPerInch}
                    stampText={stampText} stampWidth={stampWidth} stampRotation={stampRotation}
                    iconType={iconType} calloutText={calloutText}
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      </div>
      <CalibrationModal 
        isOpen={isCalibrating} 
        onClose={() => setIsCalibrating(false)} 
        onCalibrate={(newPixelsPerInch) => setPixelsPerInch(newPixelsPerInch)}
      />
      <ImportCommentsModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
      <ExportCommentsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <SummaryReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} />
    </div>
  );
}

export function StampToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type !== 'stamp') return null;
  const text = ann.text || '';

  // Fixed font size based on a base height (driven by stampWidth slider via height = width * 0.32)
  const fontSize = Math.max(14, ann.height * 0.52);
  const hPadding = fontSize * 0.8;   // horizontal padding inside rect
  const vPadding = fontSize * 0.55;  // vertical padding inside rect

  // Calculate rect dimensions from text length Ã¢â‚¬â€ rect grows to fit text
  const charWidth = fontSize * 0.62; // approximate monospace-ish width per char
  const textWidth = text.length * charWidth;
  const rectWidth = Math.max(80, textWidth + hPadding * 2);
  const rectHeight = fontSize + vPadding * 2;

  const rectX = ann.x - rectWidth / 2;
  const rectY = ann.y - rectHeight / 2;

  return (
    <g
      key={ann.id}
      className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
      onPointerDown={(e) => handleAnnotationPointerDown && handleAnnotationPointerDown(e, ann)}
      opacity={ann.opacity}
      transform={`rotate(${ann.rotation || 0}, ${ann.x}, ${ann.y})`}
    >
      <rect
        x={rectX} y={rectY} width={rectWidth} height={rectHeight}
        fill="transparent" stroke={ann.color} strokeWidth={Math.max(3, fontSize * 0.12)}
        rx={4}
      />
      <text
        x={ann.x} y={ann.y}
        fill={ann.color}
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="Arial, sans-serif"
        textAnchor="middle"
        dominantBaseline="central"
        letterSpacing={fontSize * 0.05}
        style={{ userSelect: 'none' }}
      >
        {text}
      </text>
      {isSelected && tool === 'select' && (
        <rect
          x={rectX - 8} y={rectY - 8} width={rectWidth + 16} height={rectHeight + 16}
          fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4"
        />
      )}
    </g>
  );
}

export function StickyNoteToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type !== 'sticky' && ann.type !== 'stickynote') return null;
  const Icon = ICON_MAP[ann.iconType] || MessageSquare;
  const iconSize = 24; 
  
  return (
    <g 
      key={ann.id} 
      className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`}
      onPointerDown={(e) => handleAnnotationPointerDown && handleAnnotationPointerDown(e, ann)}
      transform={`translate(${ann.x - iconSize/2}, ${ann.y - iconSize/2})`}
    >
      <rect x="0" y="0" width={iconSize} height={iconSize} rx="4" fill="white" opacity={ann.opacity} />
      <foreignObject x="0" y="0" width={iconSize} height={iconSize}>
        <div xmlns="http://www.w3.org/1999/xhtml" className="w-full h-full flex items-center justify-center">
          <Icon size={20} color={ann.color} style={{ opacity: ann.opacity }} strokeWidth={2.5} />
        </div>
      </foreignObject>

      {isSelected && tool === 'select' && (
        <rect x="-2" y="-2" width={iconSize + 4} height={iconSize + 4} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" rx="6" />
      )}
    </g>
  );
}

export function CalloutToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type !== 'callout') return null;
  const { p1, p2, p3, shaftStartX, shaftStartY } = getCalloutArrowPoints(ann.startX, ann.startY, ann.endX, ann.endY, ann.width);
  
  // Text box dimensions
  const text = ann.text || '';
  const fontSize = 16 + ann.width;
  const textPadding = 12;
  const approxTextWidth = (text.length * fontSize * 0.6) + textPadding * 2;
  const boxWidth = Math.max(80, approxTextWidth);
  const boxHeight = fontSize + textPadding * 2;

  // Box position: anchored to endX, endY
  let boxX = ann.endX;
  let boxY = ann.endY - boxHeight / 2;
  
  if (ann.startX > ann.endX) {
    boxX = ann.endX - boxWidth;
  }

  return (
    <g 
      key={ann.id} 
      className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
      onPointerDown={(e) => handleAnnotationPointerDown && handleAnnotationPointerDown(e, ann)}
      opacity={ann.opacity}
    >
      <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke="transparent" strokeWidth={Math.max(20, ann.width * 4)} />
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} fill="transparent" stroke="transparent" strokeWidth={Math.max(20, ann.width * 2)} />
      
      <line x1={shaftStartX} y1={shaftStartY} x2={ann.endX} y2={ann.endY} stroke={ann.color} strokeWidth={ann.width} />
      <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={ann.color} />
      
      <rect x={boxX} y={boxY} width={boxWidth} height={boxHeight} fill="white" stroke={ann.color} strokeWidth={ann.width} rx={6} />
      <text 
        x={boxX + boxWidth / 2} y={boxY + boxHeight / 2} 
        fill={ann.color} fontSize={fontSize} fontWeight="bold" fontFamily="sans-serif" 
        textAnchor="middle" dominantBaseline="central" style={{ userSelect: 'none' }}
      >
        {text}
      </text>
      
      {isSelected && tool === 'select' && (
        <g>
          <rect 
            x={boxX - 6} y={boxY - 6} width={boxWidth + 12} height={boxHeight + 12} 
            fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" 
          />
          <circle cx={ann.startX} cy={ann.startY} r={6 / zoom} fill="#3b82f6" />
        </g>
      )}
    </g>
  );
}

// --- ExportCommentsModal.jsx ---
export function ExportCommentsModal({ isOpen, onClose }) {
    const { annotations } = useContext(AnnotationContext);
    const { addHistoryLog } = useContext(HistoryContext);

    const [exportFormat, setExportFormat] = useState('JSON');
    const [exportScope, setExportScope] = useState('ALL'); // ALL, RESOLVED, UNRESOLVED
    const [includeReplies, setIncludeReplies] = useState(true);
    const [includeMetadata, setIncludeMetadata] = useState(true);

    if (!isOpen) return null;

    // Filter annotations based on scope
    const filteredAnnotations = annotations.filter(ann => {
        if (exportScope === 'ALL') return true;
        if (exportScope === 'RESOLVED') return ann.resolved === true;
        if (exportScope === 'UNRESOLVED') return ann.resolved !== true;
        return true;
    });

    const handleExport = () => {
        const options = { includeReplies, includeMetadata };
        
        switch (exportFormat) {
            case 'JSON':
                exportAnnotationsToJson(filteredAnnotations);
                break;
            case 'CSV':
                exportAnnotationsToCsv(filteredAnnotations, 'comments.csv', options);
                break;
            case 'TXT':
                exportAnnotationsToTxt(filteredAnnotations, 'comments.txt', options);
                break;
        }

        // Log the export action
        addHistoryLog('EXPORTED', 'multiple', { 
            format: exportFormat, 
            scope: exportScope,
            count: filteredAnnotations.length 
        });

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <DownloadCloud size={24} className="text-emerald-600" />
                        Export Comments
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {/* Format Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Export Format</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button 
                                onClick={() => setExportFormat('JSON')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'JSON' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FileJson size={24} />
                                <span className="text-xs font-bold">JSON</span>
                            </button>
                            <button 
                                onClick={() => setExportFormat('CSV')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'CSV' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <Table2 size={24} />
                                <span className="text-xs font-bold">CSV</span>
                            </button>
                            <button 
                                onClick={() => setExportFormat('TXT')}
                                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${exportFormat === 'TXT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                            >
                                <FileText size={24} />
                                <span className="text-xs font-bold">TXT</span>
                            </button>
                        </div>
                    </div>

                    {/* Scope Selection */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Export Scope</h3>
                        <select 
                            value={exportScope}
                            onChange={(e) => setExportScope(e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 text-sm"
                        >
                            <option value="ALL">All Comments ({annotations.length})</option>
                            <option value="RESOLVED">Resolved Comments Only</option>
                            <option value="UNRESOLVED">Unresolved Comments Only</option>
                        </select>
                    </div>

                    {/* Options (only for CSV and TXT for now, as JSON exports everything structurally) */}
                    {(exportFormat === 'CSV' || exportFormat === 'TXT') && (
                        <div>
                            <h3 className="text-sm font-bold text-gray-700 mb-3">Include Options</h3>
                            <div className="flex flex-col gap-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={includeReplies}
                                        onChange={(e) => setIncludeReplies(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700">Include reply threads</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={includeMetadata}
                                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-700">Include metadata (Author, Dates, Status)</span>
                                </label>
                            </div>
                        </div>
                    )}
                    
                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Export Summary</h4>
                        <p className="text-sm text-gray-800">
                            You are about to export <strong>{filteredAnnotations.length}</strong> annotations in <strong>{exportFormat}</strong> format.
                        </p>
                    </div>

                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={filteredAnnotations.length === 0}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        <DownloadCloud size={18} />
                        Generate & Download
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- HistoryPanel.jsx ---
export function HistoryPanel() {
    const { historyLogs, isHistoryPanelOpen, setIsHistoryPanelOpen, clearHistory } = useContext(HistoryContext);
    const [filter, setFilter] = useState('ALL'); // ALL, CREATED, EDITED, DELETED, RESOLVED

    if (!isHistoryPanelOpen) return null;

    const filteredLogs = historyLogs.filter(log => filter === 'ALL' || log.actionType === filter);

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATED': return <Edit3 size={14} className="text-blue-500" />;
            case 'EDITED': return <RefreshCcw size={14} className="text-amber-500" />;
            case 'DELETED': return <Trash2 size={14} className="text-red-500" />;
            case 'RESOLVED': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'REOPENED': return <AlertCircle size={14} className="text-amber-500" />;
            case 'REPLIED': return <MessageSquare size={14} className="text-purple-500" />;
            default: return <Activity size={14} className="text-gray-500" />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATED': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'EDITED': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'DELETED': return 'bg-red-50 text-red-700 border-red-200';
            case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'REOPENED': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'REPLIED': return 'bg-purple-50 text-purple-700 border-purple-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="fixed top-0 right-0 h-full w-96 bg-gray-50 border-l border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex flex-col border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <History size={20} className="text-blue-600" />
                        <h2 className="text-lg font-semibold">Audit Trail</h2>
                        <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                            {historyLogs.length}
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsHistoryPanelOpen(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                {/* Filters */}
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <Filter size={14} className="text-gray-400 shrink-0 mr-1" />
                        {['ALL', 'CREATED', 'EDITED', 'DELETED', 'RESOLVED'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    filter === f 
                                        ? 'bg-gray-800 text-white' 
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-y-auto p-4 bg-white/50">
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center">
                        <History size={48} className="opacity-20" />
                        <p className="text-sm">No history records found.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 ml-4 pl-6 flex flex-col gap-6">
                        {filteredLogs.map(log => {
                            const date = new Date(log.timestamp);
                            return (
                                <div key={log.id} className="relative">
                                    {/* Timeline Marker */}
                                    <div className="absolute -left-[35px] top-1 bg-white border-2 border-gray-200 rounded-full p-1 shadow-sm">
                                        {getActionIcon(log.actionType)}
                                    </div>
                                    
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-gray-900">{log.authorName}</span>
                                                <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${getActionColor(log.actionType)}`}>
                                                    {log.actionType}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        
                                        <div className="text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-100">
                                            <span className="text-gray-400">ID:</span> {log.annotationId.slice(0, 8)}...
                                            {log.details?.type && (
                                                <span className="ml-3"><span className="text-gray-400">Type:</span> {log.details.type}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-white">
                <button 
                    onClick={clearHistory}
                    className="w-full py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                >
                    Clear Audit Log
                </button>
            </div>
        </div>
    );
}

// --- ImportCommentsModal.jsx ---
export function ImportCommentsModal({ isOpen, onClose }) {
    const { annotations, importAnnotations } = useContext(AnnotationContext);
    
    const [file, setFile] = useState(null);
    const [importedData, setImportedData] = useState(null);
    const [error, setError] = useState(null);
    const [importMode, setImportMode] = useState('MERGE'); // MERGE or REPLACE
    
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        
        setFile(selectedFile);
        setError(null);
        
        try {
            const data = await parseImportFile(selectedFile);
            setImportedData(data);
        } catch (err) {
            setError(err.message);
            setImportedData(null);
        }
    };

    const handleImport = () => {
        if (!importedData) return;
        importAnnotations(importedData, importMode);
        resetAndClose();
    };

    const resetAndClose = () => {
        setFile(null);
        setImportedData(null);
        setError(null);
        setImportMode('MERGE');
        onClose();
    };

    const newCommentsCount = importedData ? importedData.length : 0;
    const existingIds = new Set(annotations.map(a => a.id));
    const duplicateCount = importedData ? importedData.filter(a => existingIds.has(a.id)).length : 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <FileJson size={24} className="text-blue-600" />
                        Import Comments
                    </h2>
                    <button onClick={resetAndClose} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col gap-6">
                    {/* File Upload Zone */}
                    {!importedData && !error && (
                        <div 
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                accept=".json,application/json" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Upload size={24} />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 mb-1">Click to upload JSON file</h3>
                            <p className="text-xs text-gray-500">Supports exported annotations JSON</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-700">
                            <AlertCircle size={20} className="shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-sm">Import Failed</h4>
                                <p className="text-xs mt-1">{error}</p>
                            </div>
                        </div>
                    )}

                    {importedData && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={24} className="text-emerald-600" />
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm">File Parsed Successfully</h4>
                                        <p className="text-xs text-emerald-700 font-medium">Found {newCommentsCount} annotations in {file.name}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Conflict Resolution</h4>
                                
                                {duplicateCount > 0 && (
                                    <div className="mb-4 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-2">
                                        <AlertCircle size={16} /> 
                                        {duplicateCount} duplicate comment(s) detected.
                                    </div>
                                )}
                                
                                <div className="flex flex-col gap-2">
                                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="MERGE" 
                                            checked={importMode === 'MERGE'} 
                                            onChange={() => setImportMode('MERGE')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Merge with existing</div>
                                            <div className="text-xs text-gray-500">Skips duplicates and preserves your current work.</div>
                                        </div>
                                    </label>
                                    
                                    <label className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-blue-400">
                                        <input 
                                            type="radio" 
                                            name="importMode" 
                                            value="REPLACE" 
                                            checked={importMode === 'REPLACE'} 
                                            onChange={() => setImportMode('REPLACE')}
                                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <div className="text-sm font-bold text-gray-900">Replace existing</div>
                                            <div className="text-xs text-gray-500">Deletes all current annotations and applies the imported file.</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                    <button onClick={resetAndClose} className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleImport}
                        disabled={!importedData}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Execute Import
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- ReviewAnnotationHeader.jsx ---
export function ReviewAnnotationHeader({ onBack }) {
  const FileIcon = ({ bg, icon = null, rotate = 0, size = 34, floatClass = 'animate-float-1' }) => {
    const w = size;
    const h = size * 1.22;
    return (
      <div className={floatClass}>
        <div
          style={{ transform: `rotate(${rotate}deg)`, width: w, height: h, filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}
          className="hover:scale-115 transition-transform duration-300 cursor-default flex-shrink-0 scale-[0.50] sm:scale-100 origin-center"
        >
          <svg width={w} height={h} viewBox="-7 -7 70 82" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 0h36l16 16v48a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill="white" stroke="white" strokeWidth="12" strokeLinejoin="round" />
            <path d="M4 0h36l16 16v48a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4z" fill={bg} />
            <path d="M40 0l16 16H44a4 4 0 0 1-4-4V0z" fill="rgba(0,0,0,0.2)" />
            {icon}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <header className="w-full relative pt-1 sm:pt-2 pb-2 sm:pb-3 mb-2 sm:mb-3 select-none">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-1.5 left-3 sm:top-5 sm:left-6 md:left-10 z-50 text-[#1e2a52] hover:text-blue-950 font-bold flex items-center gap-1.5 sm:gap-2 bg-white/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-sm backdrop-blur-md border border-slate-200/90 transition-all hover:shadow-md hover:scale-105 cursor-pointer text-xs sm:text-sm"
        >
          <svg className="w-4 h-4 text-[#1e2a52]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span>Back</span>
        </button>
      )}
      <div className="absolute hidden sm:block left-[13%] top-[32%] w-3 h-3 rounded-full bg-blue-500 shadow pointer-events-none z-10 animate-float-3" />
      <div className="absolute hidden sm:block left-[35%] top-[62%] w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm pointer-events-none z-10 animate-float-1" />
      <div className="absolute hidden sm:block right-[34%] top-[20%] w-3 h-3 rounded-full bg-emerald-400 shadow pointer-events-none z-10 animate-float-5" />
      <div className="absolute hidden sm:block right-[19%] top-[58%] w-2.5 h-2.5 rounded-full bg-red-400 shadow-sm pointer-events-none z-10 animate-float-2" />
      <div className="absolute hidden sm:block right-[37%] top-[74%] w-2 h-2 rounded-full bg-orange-400 shadow-sm pointer-events-none z-10 animate-float-4" />

      <div className="absolute flex left-0 sm:left-4 md:left-[17%]" style={{ top: '45%', zIndex: 15 }}>
        <FileIcon bg="#9333EA" rotate={-13} size={32} floatClass="animate-float-1"
          icon={<><circle cx="18" cy="30" r="3.5" fill="rgba(255,255,255,0.7)" /><path d="M6 48 L18 35 L27 43 L36 33 L50 47 L50 54 L6 54Z" fill="rgba(255,255,255,0.55)" /></>}
        />
      </div>

      <div className="absolute flex left-6 sm:left-20 md:left-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#2563EB" rotate={7} size={38} floatClass="animate-float-2"
          icon={<text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">AI</text>}
        />
      </div>

      <div className="absolute flex right-6 sm:right-20 md:right-[26%]" style={{ top: '4%', zIndex: 15 }}>
        <FileIcon bg="#16A34A" rotate={-7} size={38} floatClass="animate-float-4"
          icon={<text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">A</text>}
        />
      </div>

      <div className="absolute flex right-0 sm:right-4 md:right-[20%]" style={{ top: '42%', zIndex: 15 }}>
        <FileIcon bg="#EA580C" rotate={9} size={32} floatClass="animate-float-5"
          icon={<text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="20" fill="white" opacity="0.95">R</text>}
        />
      </div>

      <div className="absolute hidden lg:flex" style={{ right: '15%', top: '56%', zIndex: 15 }}>
        <FileIcon bg="#64748B" rotate={-5} size={30} floatClass="animate-float-6"
          icon={<text x="28" y="50" textAnchor="middle" fontFamily="Arial Black,sans-serif" fontWeight="900" fontSize="12" fill="white" letterSpacing="0.5">PDF</text>}
        />
      </div>

      <div className="flex items-center justify-center w-full relative z-20">
        <div className="flex-1 text-center flex flex-col items-center justify-center min-w-0 pt-1 sm:pt-2 md:pt-3 px-2">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-[#1e2a52] tracking-tight leading-tight break-words pb-1">
            Review and Annotation
          </h1>
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm md:text-base font-semibold text-slate-700 max-w-2xl mx-auto leading-relaxed">
            Free Edit PDF Document with sticky notes, freehand drawing, & highlights
          </p>
        </div>
      </div>
    </header>
  );
}

// --- PdfUploader.jsx ---
export function PdfUploader({ onFileSelect }) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf') {
                onFileSelect(file);
            } else {
                alert('Please upload a valid PDF file.');
            }
        }
    };

    const handleFileInput = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    };

    return (
        <div className="w-full flex items-center justify-center py-4">
            <div 
                className={`w-full max-w-xl bg-white rounded-3xl p-6 sm:p-12 shadow-sm transition-all duration-300 border-2 border-dashed ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 shadow-inner text-gray-700">
                        <Upload size={28} strokeWidth={2.5} />
                    </div>
                    
                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                        Drop files here or click to browse
                    </h2>
                    
                    <p className="text-gray-500 mb-6 text-sm">
                        Accepted: PDF files (.pdf)
                    </p>
                    
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileInput}
                    />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        Browse Files
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- PropertiesPanel.jsx ---
export function PropertiesPanel() {
    const { 
        annotations, 
        selectedAnnotationId, 
        updateAnnotation,
        isPropertiesPanelOpen,
        setIsPropertiesPanelOpen
    } = useContext(AnnotationContext);

    if (!isPropertiesPanelOpen) return null;

    const selectedAnnotation = annotations.find(a => a.id === selectedAnnotationId);

    const handlePropertyChange = (property, value) => {
        if (!selectedAnnotationId) return;
        updateAnnotation(selectedAnnotationId, { [property]: value });
    };

    return (
        <div className="fixed top-0 left-0 h-full w-80 bg-gray-50 border-r border-gray-200 shadow-2xl z-[100] flex flex-col transition-transform transform translate-x-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2 text-gray-800">
                    <Sliders size={20} className="text-purple-600" />
                    <h2 className="text-lg font-semibold">Properties</h2>
                </div>
                <button 
                    onClick={() => setIsPropertiesPanelOpen(false)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                {!selectedAnnotation ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3 text-center opacity-70">
                        <Sliders size={48} className="opacity-50 text-purple-600 mb-2" />
                        <h3 className="text-gray-700 font-bold">No Annotation Selected</h3>
                        <p className="text-sm">Click on any drawing or markup on the document to edit its properties.</p>
                    </div>
                ) : (
                    <>
                        {/* Basic Info */}
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3">
                            <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold uppercase tracking-wider text-xs shadow-sm mt-1 flex-shrink-0"
                                style={{ backgroundColor: selectedAnnotation.strokeColor || selectedAnnotation.color || '#3b82f6' }}
                            >
                                {selectedAnnotation.type.substring(0,2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 capitalize truncate">{selectedAnnotation.type}</h3>
                                <p className="text-xs text-gray-500 mt-1 truncate">Page {selectedAnnotation.pageNumber || 1}</p>
                            </div>
                        </div>

                        {/* Appearance Properties */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                <Palette size={14} className="text-gray-500" />
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Appearance</h4>
                            </div>
                            <div className="p-4 flex flex-col gap-4">
                                {/* Stroke Color */}
                                <div>
                                    <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                        Stroke Color
                                        <span className="text-xs text-gray-400 font-mono">{selectedAnnotation.strokeColor || selectedAnnotation.color || '#000000'}</span>
                                    </label>
                                    <input 
                                        type="color" 
                                        value={selectedAnnotation.strokeColor || selectedAnnotation.color || '#000000'}
                                        onChange={(e) => {
                                            handlePropertyChange('strokeColor', e.target.value);
                                            handlePropertyChange('color', e.target.value); // fallback
                                        }}
                                        className="w-full h-8 rounded cursor-pointer border-0 p-0"
                                    />
                                </div>

                                {/* Fill Color (if applicable) */}
                                {['rectangle', 'circle', 'polygon'].includes(selectedAnnotation.type.toLowerCase()) && (
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Fill Color
                                            <span className="text-xs text-gray-400 font-mono">{selectedAnnotation.fillColor || 'Transparent'}</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="color" 
                                                value={selectedAnnotation.fillColor || '#ffffff'}
                                                onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                                                className="flex-1 h-8 rounded cursor-pointer border-0 p-0"
                                            />
                                            <button 
                                                onClick={() => handlePropertyChange('fillColor', null)}
                                                className="px-2 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 font-medium"
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Border Width */}
                                {selectedAnnotation.type !== 'stickynote' && (
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Stroke Width
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{selectedAnnotation.strokeWidth || 2}px</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="1" max="20" 
                                            value={selectedAnnotation.strokeWidth || 2}
                                            onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
                                            className="w-full accent-purple-600"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Text Properties (if applicable) */}
                        {['freetext', 'textbox', 'callout'].includes(selectedAnnotation.type.toLowerCase()) && (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                    <Type size={14} className="text-gray-500" />
                                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Text Properties</h4>
                                </div>
                                <div className="p-4 flex flex-col gap-4">
                                    <div>
                                        <label className="flex items-center justify-between text-sm text-gray-700 font-medium mb-2">
                                            Font Size
                                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{selectedAnnotation.fontSize || 12}pt</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="8" max="72" 
                                            value={selectedAnnotation.fontSize || 12}
                                            onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))}
                                            className="w-full accent-purple-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metadata / Audit Info (Read-only) */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="bg-gray-100/50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                                <Activity size={14} className="text-gray-500" />
                                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Metadata</h4>
                            </div>
                            <div className="p-4 flex flex-col gap-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><User size={14}/> Author</div>
                                    <div className="font-medium text-gray-900">{selectedAnnotation.authorName || 'Current User'}</div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><Tag size={14}/> Status</div>
                                    <div className={`font-bold ${selectedAnnotation.resolved ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {selectedAnnotation.resolved ? 'Resolved' : 'Open'}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-500"><Clock size={14}/> Created</div>
                                    <div className="font-medium text-gray-900 text-xs text-right">
                                        {selectedAnnotation.createdDate ? new Date(selectedAnnotation.createdDate).toLocaleString() : 'N/A'}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
                                    <div className="flex items-center gap-2 text-gray-400"><Fingerprint size={14}/> ID</div>
                                    <div className="font-mono text-gray-400 text-[10px] truncate max-w-[120px]" title={selectedAnnotation.id}>
                                        {selectedAnnotation.id}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}

// --- SummaryReportModal.jsx ---
export function SummaryReportModal({ isOpen, onClose }) {
    const { annotations } = useContext(AnnotationContext);

    // Compute Statistics
    const stats = useMemo(() => {
        const total = annotations.length;
        const resolved = annotations.filter(a => a.resolved).length;
        const open = total - resolved;
        const totalReplies = annotations.reduce((acc, ann) => acc + (ann.replies?.length || 0), 0);
        
        // Type Breakdown
        const types = {};
        annotations.forEach(a => {
            types[a.type] = (types[a.type] || 0) + 1;
        });

        // Sort types by count
        const sortedTypes = Object.entries(types).sort((a, b) => b[1] - a[1]);

        // Page Breakdown
        const pages = {};
        annotations.forEach(a => {
            const p = a.pageNumber || 1;
            if (!pages[p]) {
                pages[p] = { total: 0, open: 0, resolved: 0 };
            }
            pages[p].total++;
            if (a.resolved) pages[p].resolved++;
            else pages[p].open++;
        });

        return { total, resolved, open, totalReplies, sortedTypes, pages };
    }, [annotations]);

    const handlePrint = () => {
        window.print();
    };

    if (!isOpen) return null;

    const resolutionPercent = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 sm:p-8 print:absolute print:inset-0 print:block print:p-0 print:bg-white print:z-[9999]">
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] print:h-auto print:w-full print:max-w-none flex flex-col shadow-2xl overflow-hidden print:overflow-visible print:shadow-none print:block">
                
                {/* Header - Hidden on Print */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Annotation Summary Report</h2>
                            <p className="text-sm text-gray-500">Executive dashboard and review statistics</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => exportAnnotationsToCsv(annotations)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Export Data
                        </button>
                        <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                        >
                            <Printer size={16} />
                            Print Report
                        </button>
                        <div className="w-px h-8 bg-gray-200 mx-1"></div>
                        <button 
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Printable Content Area */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 print:p-0 print:overflow-visible print:block">
                    
                    {/* Print Header (Only visible on print) */}
                    <div className="hidden print:block mb-8 border-b-2 border-indigo-600 pb-4">
                        <h1 className="text-3xl font-bold text-gray-900">Annotation Summary Report</h1>
                        <div className="flex justify-between text-sm text-gray-500 mt-2">
                            <span>Generated: {new Date().toLocaleString()}</span>
                            <span>Total Pages Analyzed: {Object.keys(stats.pages).length}</span>
                        </div>
                    </div>

                    {stats.total === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4 text-center">
                            <Activity size={48} className="opacity-20 text-indigo-600" />
                            <div>
                                <h3 className="text-lg font-bold text-gray-700">No Data Available</h3>
                                <p className="text-sm">Draw annotations on the document to generate an analysis report.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-4xl mx-auto space-y-10">
                            
                            {/* Executive Summary Cards */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <LayoutTemplate className="text-indigo-600" size={18} /> Executive Summary
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-indigo-600 text-sm font-bold mb-1">Total Markups</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.total}</div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-emerald-600 text-sm font-bold mb-1">Resolved</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.resolved}</div>
                                    </div>
                                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-amber-600 text-sm font-bold mb-1">Pending</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.open}</div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl print:border-gray-300">
                                        <div className="text-blue-600 text-sm font-bold mb-1">Discussion Replies</div>
                                        <div className="text-3xl font-black text-gray-900">{stats.totalReplies}</div>
                                    </div>
                                </div>
                            </section>

                            {/* Resolution Progress */}
                            <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm print:shadow-none">
                                <div className="flex justify-between items-end mb-3">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <CheckCircle className="text-emerald-500" size={18} /> Resolution Progress
                                    </h3>
                                    <span className="text-2xl font-black text-emerald-600">{resolutionPercent}%</span>
                                </div>
                                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex border border-gray-200">
                                    <div 
                                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                                        style={{ width: `${resolutionPercent}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 font-medium mt-2">
                                    <span>{stats.resolved} Resolved</span>
                                    <span>{stats.open} Open</span>
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Annotation Type Breakdown */}
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <Activity className="text-indigo-600" size={18} /> Type Breakdown
                                    </h3>
                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm print:shadow-none space-y-4">
                                        {stats.sortedTypes.map(([type, count]) => {
                                            const percent = Math.round((count / stats.total) * 100);
                                            return (
                                                <div key={type} className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span className="capitalize text-gray-700">{type}</span>
                                                        <span className="text-gray-900">{count} <span className="text-gray-400 ml-1 text-xs font-normal">({percent}%)</span></span>
                                                    </div>
                                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-indigo-500"
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </section>

                                {/* Page-wise Summary Table */}
                                <section>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                        <MessageSquare className="text-indigo-600" size={18} /> Page Analysis
                                    </h3>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm print:shadow-none bg-white">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                                <tr>
                                                    <th className="px-4 py-3 font-semibold">Page</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Total</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Open</th>
                                                    <th className="px-4 py-3 font-semibold text-center">Resolved</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {Object.entries(stats.pages).sort((a,b) => Number(a[0]) - Number(b[0])).map(([page, data]) => (
                                                    <tr key={page} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 font-medium text-gray-900">Page {page}</td>
                                                        <td className="px-4 py-3 text-center text-gray-700">{data.total}</td>
                                                        <td className="px-4 py-3 text-center text-amber-600 font-medium">{data.open}</td>
                                                        <td className="px-4 py-3 text-center text-emerald-600 font-medium">{data.resolved}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>

                        </div>
                    )}
                </div>
            </div>
            
            {/* Global Print Styles embedded in component */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    @page { margin: 1cm; size: A4 portrait; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; overflow: visible !important; height: auto !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:block { display: block !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:bg-white { background-color: white !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:border-gray-300 { border-color: #d1d5db !important; border-width: 1px !important; border-style: solid !important; }
                    .print\\:h-auto { height: auto !important; }
                    .print\\:max-w-none { max-width: none !important; }
                    
                    /* Force background colors on print */
                    .bg-indigo-50 { background-color: #eef2ff !important; }
                    .bg-emerald-50 { background-color: #ecfdf5 !important; }
                    .bg-amber-50 { background-color: #fffbeb !important; }
                    .bg-blue-50 { background-color: #eff6ff !important; }
                    .bg-emerald-500 { background-color: #10b981 !important; }
                    .bg-indigo-500 { background-color: #6366f1 !important; }
                    .bg-gray-50 { background-color: #f9fafb !important; }
                    .bg-gray-100 { background-color: #f3f4f6 !important; }
                }
            `}} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE ENTRY POINT — used directly by App.jsx
// ═══════════════════════════════════════════════════════════════════

/**
 * PDF_TOOLS
 * Flat array of tools on this sub-page.
 * Used by App.jsx for the global search index.
 */
export const PDF_TOOLS = [
  {
    id: 'draw-markup',
    title: 'Ultimate Annotation Suite',
    description:
      'Highlight, underline, draw freehand, add shapes, measure distances, and stamp PDFs with sticky notes and callouts.',
    icon: 'PenTool',
    category: 'review-annotation',
  },
];

/**
 * ReviewAnnotationProviders
 * Wraps all three React contexts required by annotation tool components.
 */
function ReviewAnnotationProviders({ children }) {
  return (
    <HistoryProvider>
      <AnnotationProvider>
        <ReviewProvider>
          {children}
        </ReviewProvider>
      </AnnotationProvider>
    </HistoryProvider>
  );
}

/**
 * ReviewAnnotationPage
 * Top-level routable page exported for App.jsx.
 * Renders Dashboard by default; switches to DrawAndMarkupTool on card click.
 */
export function ReviewAnnotationPage({ onBack }) {
  return (
    <ReviewAnnotationProviders>
      <DrawAndMarkupTool onBack={onBack} />
    </ReviewAnnotationProviders>
  );
}

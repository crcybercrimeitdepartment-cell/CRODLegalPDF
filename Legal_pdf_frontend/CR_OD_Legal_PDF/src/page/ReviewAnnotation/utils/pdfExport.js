
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { getStroke } from 'perfect-freehand';

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
  'pt²': Math.pow(1 / 72, 2),
  'in²': Math.pow(1, 2),
  'ft²': Math.pow(12, 2),
  'yd²': Math.pow(36, 2),
  'mi²': Math.pow(5280 * 12, 2),
  'mm²': Math.pow(1 / 25.4, 2),
  'cm²': Math.pow(1 / 2.54, 2),
  'm²': Math.pow(100 / 2.54, 2),
  'km²': Math.pow(100000 / 2.54, 2),
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

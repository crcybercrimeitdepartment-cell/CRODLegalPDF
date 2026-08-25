import React, { useState, useCallback, useRef, useContext } from 'react';
import { downloadAnnotationsPdf } from './utils/pdfExport';
import AnnotationLayer from './AnnotationLayer';
import PdfUploader from './PdfUploader';
import { AnnotationContext } from './context/AnnotationContext';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import { getStroke } from 'perfect-freehand';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  PenTool, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
} from 'lucide-react';

const ext = pdfjs.version >= '4' ? 'mjs' : 'js';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.${ext}`;

// ==========================================
// UTILS
// ==========================================
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

const PEN_PROFILES = {
  ballpoint: { name: 'Ball Pen', thinning: 0.1, smoothing: 0.5, streamline: 0.5, simulatePressure: true },
  fountain: { name: 'Fountain Pen', thinning: 0.7, smoothing: 0.8, streamline: 0.8, simulatePressure: true },
  marker: { name: 'Marker', thinning: -0.1, smoothing: 0.3, streamline: 0.5, simulatePressure: false },
  brush: { name: 'Brush Pen', thinning: 0.9, smoothing: 0.9, streamline: 0.9, simulatePressure: true, taperStart: 5, taperEnd: 5 },
};

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


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor, penStyle, setPenStyle,
  strokeWidth, setStrokeWidth, opacity, setOpacity,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#1e3a8a', '#ef4444', '#22c55e', '#eab308', '#a855f7'];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-3 flex flex-col md:flex-row items-center gap-4 border border-gray-200 z-50 transition-all duration-300 w-max max-w-[98%] overflow-x-auto">
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onToggleComments} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all mr-1" title="Toggle Comments"><MessageSquare size={20} /></button>
        <button onClick={onBack} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all mr-2" title="Back to Dashboard">
          <ArrowLeft size={20} />
        </button>
        <label className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer shadow-sm transition-all text-sm font-medium whitespace-nowrap">
          <Upload size={16} /> Upload PDF
          <input type="file" accept="application/pdf" onChange={onPdfUpload} className="hidden" />
        </label>
        <button onClick={onDownloadPdf} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer shadow-sm transition-all text-sm font-medium whitespace-nowrap" title="Download PDF">
          <Download size={16} /> Download
        </button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => setTool('ink')} className={`p-2 rounded-xl transition-all ${tool === 'ink' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Ink Tool"><PenTool size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* Pen Style Selector */}
      <div className="flex items-center gap-2 shrink-0 w-max">
        <select 
          value={penStyle} 
          onChange={(e) => {
            const val = e.target.value;
            setPenStyle(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { penStyle: val });
            setTool('ink');
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2 outline-none font-medium cursor-pointer"
        >
          {Object.entries(PEN_PROFILES).map(([key, profile]) => (
            <option key={key} value={key}>{profile.name}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        {colors.map(c => (
          <button key={c} onClick={() => {
            setStrokeColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: c });
          }} className={`w-6 h-6 rounded-full transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
        <input type="color" value={strokeColor} onChange={(e) => {
          setStrokeColor(e.target.value);
          if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: e.target.value });
        }} className="w-7 h-7 p-0 border-0 rounded overflow-hidden cursor-pointer" />
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex flex-col gap-2 w-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Width</span>
          <input type="range" min="2" max="30" value={strokeWidth} onChange={(e) => {
            const val = Number(e.target.value);
            setStrokeWidth(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { width: val });
          }} className="w-full cursor-pointer accent-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Opacity</span>
          <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => {
            const val = Number(e.target.value);
            setOpacity(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { opacity: val });
          }} className="w-full cursor-pointer accent-blue-500" />
        </div>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={undo} disabled={!canUndo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Undo"><Undo2 size={20} /></button>
        <button onClick={redo} disabled={!canRedo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Redo"><Redo2 size={20} /></button>
        <button onClick={() => deleteAnnotation(selectedAnnotationId)} disabled={!selectedAnnotationId} className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Delete Selected"><Trash2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={zoomOut} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom Out"><ZoomOut size={20} /></button>
        <button onClick={resetZoom} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Reset Zoom"><Maximize size={20} /></button>
        <button onClick={zoomIn} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom In"><ZoomIn size={20} /></button>
      </div>
    </div>
  );
}

function DrawingBoard({
  annotations, addAnnotation, updateAnnotation, selectedAnnotationId,
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, strokeWidth, penStyle,
  opacity, pageNumber
}) {
  const containerRef = useRef(null);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggingAnnId, setDraggingAnnId] = useState(null);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [zoom, pan]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (e.button !== 0 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    // Some touch devices don't provide pressure initially, default to 0.5 if missing/0
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'ink') {
      setIsDrawing(true);
      setCurrentStroke({
        id: uuidv4(),
        type: 'ink',
        pageNumber,
        points: [[x, y, pressure]],
        color: strokeColor,
        width: strokeWidth,
        penStyle: penStyle,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });
    } else if (tool === 'select' && e.target.tagName === 'svg') {
      setSelectedAnnotationId(null);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setDraggingAnnId(ann.id);
      setIsDragging(true);
      // For ink strokes, we calculate offset to the first point for drag logic
      setDragOffset({
        x: x - ann.points[0][0],
        y: y - ann.points[0][1]
      });
    }
  };

  const handlePointerMove = (e) => {
    if (isDrawing && currentStroke) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;
      
      setCurrentStroke((prev) => ({
        ...prev,
        points: [...prev.points, [x, y, pressure]],
      }));
    } else if (isDragging && draggingAnnId) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const ann = annotations.find(a => a.id === draggingAnnId);
      if (ann) {
        // Calculate the translation delta based on the first point
        const dx = x - dragOffset.x - ann.points[0][0];
        const dy = y - dragOffset.y - ann.points[0][1];
        
        // Translate all points
        const newPoints = ann.points.map(p => [p[0] + dx, p[1] + dy, p[2]]);
        
        updateAnnotation(draggingAnnId, { points: newPoints });
      }
    }
  };

  const handlePointerUp = (e) => {
    if (isDrawing && currentStroke) {
      setIsDrawing(false);
      if (currentStroke.points.length > 1) {
        addAnnotation(currentStroke);
      }
      setCurrentStroke(null);
    }
    if (isDragging) {
      setIsDragging(false);
      setDraggingAnnId(null);
    }
  };

  const handleContextMenu = (e) => e.preventDefault();
  const allAnnotations = currentStroke ? [...annotations, currentStroke] : annotations;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${tool === 'ink' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'none' }} // Crucial for pressure/touch capture on mobile/tablets
    >
      <svg
        className="w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        <AnnotationLayer 
          annotations={(typeof allAnnotations !== 'undefined' ? allAnnotations : annotations).filter(a => a.pageNumber === pageNumber)}
          zoom={zoom}
          selectedAnnotationId={selectedAnnotationId}
          tool={tool}
          handleAnnotationPointerDown={handleAnnotationPointerDown}
          handleResizePointerDown={typeof handleResizePointerDown !== 'undefined' ? handleResizePointerDown : () => {}}
          pixelsPerInch={typeof pixelsPerInch !== 'undefined' ? pixelsPerInch : 72}
        />
      </svg>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function InkToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          if (ann.type === 'ink') {
            const profile = PEN_PROFILES[ann.penStyle] || PEN_PROFILES['ballpoint'];
            const strokeData = getStroke(ann.points, {
              ...profile,
              size: ann.width * (ann.penStyle === 'marker' ? 2 : 1),
            });
            const pathData = getSvgPathFromStroke(strokeData);
            
            // Marker blending logic (multiply effect by using opacity)
            let actualOpacity = ann.opacity;
            if (ann.penStyle === 'marker') {
              actualOpacity = Math.min(ann.opacity, 0.6); // Markers are semi-transparent
            }

            return (
              <g 
                key={ann.id} 
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              >
                <path d={pathData} fill={ann.color} opacity={actualOpacity} />
                
                {/* Invisible thicker path for easier selection */}
                <path d={pathData} fill="transparent" stroke="transparent" strokeWidth={Math.max(20, ann.width * 2)} />
                
                {isSelected && (
                  <path d={pathData} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" opacity="0.8" />
                )}
              </g>
            );
          }
          return null;
        
}

export default function InkAnnotationPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('ink');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [penStyle, setPenStyle] = useState('fountain');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
    
  const zoomIn = () => setZoom(z => Math.min(z + 0.2, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const resetZoom = () => { setZoom(1); };

  const onPdfUpload = (event) => {
    const { files } = event.target;
    if (files && files[0]) setFile(files[0]);
  };

  const onDocumentLoadSuccess = ({ numPages }) => setNumPages(numPages);

  const handleDownloadPdf = async () => {
    await downloadAnnotationsPdf(file, annotations, typeof pixelsPerInch !== "undefined" ? pixelsPerInch : 72);
  };

  
  if (!file) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col relative">
        <div className="absolute top-4 left-4 z-50">
          <button onClick={onBack} className="flex items-center gap-2 p-2 px-4 rounded-xl text-slate-700 bg-white border border-gray-200 hover:bg-slate-50 transition-all shadow-sm font-medium">
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
            <PdfUploader onFileSelect={(f) => setFile(f)} />
        </div>
      </div>
    );
  }
return (
    <div className="relative w-screen h-screen bg-gray-200 flex flex-col">
      <Toolbar tool={tool} setTool={setTool} strokeColor={strokeColor} setStrokeColor={setStrokeColor}
        penStyle={penStyle} setPenStyle={setPenStyle}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} opacity={opacity} setOpacity={setOpacity}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} updateAnnotation={updateAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
        onPdfUpload={onPdfUpload} onDownloadPdf={handleDownloadPdf} onBack={onBack} onToggleComments={() => setIsCommentPanelOpen(prev => !prev)}
      />
      <div className="flex-1 overflow-auto p-4 pt-24 pb-20 flex justify-center">
        <div className="relative transition-transform origin-top flex flex-col items-center" style={{ transform: `scale(${zoom})` }}>
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-6">
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative bg-white shadow-xl">
                  <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} />
                  <div className="absolute inset-0 z-10 overflow-hidden">
                    <DrawingBoard
                      pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                      updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                      setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                      tool={tool} strokeColor={strokeColor} strokeWidth={strokeWidth} penStyle={penStyle} opacity={opacity}
                    />
                  </div>
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

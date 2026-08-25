import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { downloadAnnotationsPdf } from './utils/pdfExport';
import AnnotationLayer from './AnnotationLayer';
import PdfUploader from './PdfUploader';
import { AnnotationContext } from './context/AnnotationContext';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Milestone, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, Settings2, MessageSquare
} from 'lucide-react';

const ext = pdfjs.version >= '4' ? 'mjs' : 'js';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.${ext}`;

// ==========================================
// UTILS
// ==========================================
function hexToRgb(hex) {
  if (hex === 'transparent' || !hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

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

function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateTotalDistancePx(vertices) {
  if (!vertices || vertices.length < 2) return 0;
  let dist = 0;
  for (let i = 1; i < vertices.length; i++) {
    dist += calculateDistance(vertices[i-1].x, vertices[i-1].y, vertices[i].x, vertices[i].y);
  }
  return dist;
}

function formatMeasurement(distancePx, pixelsPerInch, unit, precision) {
  const inches = distancePx / pixelsPerInch;
  const realDistance = inches / unitToInches[unit];
  return `${realDistance.toFixed(precision)} ${unit}`;
}


// ==========================================
// COMPONENTS
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
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
              <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#3b82f6" strokeWidth={2} markerEnd="url(#arrow)" markerStart="url(#arrow)"/>
              <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
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

function Toolbar({
  tool, setTool, strokeColor, setStrokeColor,
  borderWidth, setBorderWidth, unit, setUnit, precision, setPrecision,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack,
  onOpenCalibration
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#4f46e5'];
  const units = ['pt', 'mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'];
  const precisions = [0, 1, 2, 3];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-3 flex flex-col md:flex-row items-center gap-4 border border-gray-200 z-40 transition-all duration-300 w-max max-w-[98%] overflow-x-auto">
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
        <button onClick={() => setTool('distance')} className={`p-2 rounded-xl transition-all ${tool === 'distance' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Distance Tool"><Milestone size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-gray-500 font-medium shrink-0">Color</span>
        {colors.map(c => (
        <button key={`s-${c}`} onClick={() => {
            setStrokeColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strokeColor: c });
        }} className={`w-5 h-5 rounded-full border border-gray-300 transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>

      <div className="flex flex-col gap-1 w-32 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Width</span>
          <input type="range" min="1" max="10" step="1" value={borderWidth} onChange={(e) => {
            const val = Number(e.target.value);
            setBorderWidth(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { borderWidth: val });
          }} className="w-full cursor-pointer accent-blue-500" />
        </div>
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Unit</span>
            <select value={unit} onChange={(e) => {
                setUnit(e.target.value);
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { unit: e.target.value });
            }} className="text-xs bg-gray-50 border border-gray-200 rounded p-0.5 outline-none flex-1">
                {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
        </div>
      </div>

      <div className="flex flex-col gap-1 w-32 shrink-0">
        <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 font-medium shrink-0 w-12">Precision</span>
            <select value={precision} onChange={(e) => {
                const val = Number(e.target.value);
                setPrecision(val);
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { precision: val });
            }} className="text-xs bg-gray-50 border border-gray-200 rounded p-0.5 outline-none flex-1">
                {precisions.map(p => <option key={p} value={p}>{p} dec</option>)}
            </select>
        </div>
        <button onClick={onOpenCalibration} className="text-xs font-semibold bg-gray-800 text-white rounded py-1 px-2 hover:bg-gray-700 transition-colors w-full mt-1">
          Calibrate Scale
        </button>
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
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, borderWidth,
  unit, precision, pixelsPerInch, pageNumber
}) {
  const containerRef = useRef(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentVertices, setCurrentVertices] = useState([]);
  const [currentMousePos, setCurrentMousePos] = useState(null);
  
  const [isDraggingWhole, setIsDraggingWhole] = useState(false);
  const [dragOffsetWhole, setDragOffsetWhole] = useState({ x: 0, y: 0 });
  const [dragStartVertices, setDragStartVertices] = useState([]);
  
  const [resizingVertexIndex, setResizingVertexIndex] = useState(null);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.resize-handle') || (tool === 'select' && e.target.tagName !== 'svg' && e.target.tagName !== 'polyline' && e.target.tagName !== 'text')) {
      return;
    }

    if (tool === 'select' && (e.target.tagName === 'svg' || e.target.tagName === 'DIV')) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'distance') {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentVertices([coords]);
        setCurrentMousePos(coords);
        setSelectedAnnotationId(null);
      } else {
        // Add vertex
        setCurrentVertices(prev => [...prev, coords]);
      }
    }
  };

  const handleFinishDrawing = () => {
    if (tool === 'distance' && isDrawing) {
      if (currentVertices.length > 1) {
        const newId = uuidv4();
        addAnnotation({
          id: newId,
          type: 'distance',
          pageNumber,
          vertices: [...currentVertices],
          strokeColor,
          borderWidth,
          unit,
          precision,
          createdDate: new Date().toISOString(),
          visibility: true,
        });
        setSelectedAnnotationId(newId);
      }
      setIsDrawing(false);
      setCurrentVertices([]);
      setCurrentMousePos(null);
    }
  };

  const handleDoubleClick = (e) => {
    handleFinishDrawing();
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setDragOffsetWhole(coords);
      setDragStartVertices(ann.vertices.map(v => ({...v})));
      setIsDraggingWhole(true);
    }
  };

  const handleResizePointerDown = (e, ann, index) => {
    e.stopPropagation();
    setSelectedAnnotationId(ann.id);
    setResizingVertexIndex(index);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);

      if (isDrawing) {
        setCurrentMousePos(coords);
      } else if (isDraggingWhole && selectedAnnotationId) {
        const ann = annotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          const dx = coords.x - dragOffsetWhole.x;
          const dy = coords.y - dragOffsetWhole.y;
          const newVertices = dragStartVertices.map(v => ({
            x: v.x + dx,
            y: v.y + dy
          }));
          updateAnnotation(selectedAnnotationId, { vertices: newVertices });
        }
      } else if (resizingVertexIndex !== null && selectedAnnotationId) {
        const ann = annotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          const newVertices = [...ann.vertices];
          newVertices[resizingVertexIndex] = coords;
          updateAnnotation(selectedAnnotationId, { vertices: newVertices });
        }
      }
    };

    const handlePointerUp = () => {
      setIsDraggingWhole(false);
      setResizingVertexIndex(null);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && isDrawing && currentVertices.length > 1) {
            handleFinishDrawing();
        } else if (e.key === 'Escape' && isDrawing) {
            setIsDrawing(false);
            setCurrentVertices([]);
            setCurrentMousePos(null);
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
    isDrawing, currentVertices, isDraggingWhole, dragOffsetWhole, 
    resizingVertexIndex, selectedAnnotationId,
    getCanvasCoordinates, addAnnotation, updateAnnotation, annotations,
    pageNumber, strokeColor, borderWidth, dragStartVertices, unit, precision
  ]);

  const renderPolyline = (vertices, previewCoord = null) => {
    if (!vertices || vertices.length === 0) return "";
    let points = vertices.map(v => `${v.x},${v.y}`).join(" ");
    if (previewCoord) {
      points += ` ${previewCoord.x},${previewCoord.y}`;
    }
    return points;
  };

  const renderMeasurementLabel = (vertices, totalPx, u, prec, color) => {
      if (vertices.length < 2) return null;
      
      const lastVertex = vertices[vertices.length - 1];
      const prevVertex = vertices[vertices.length - 2];
      const labelText = formatMeasurement(totalPx, pixelsPerInch, u, prec);
      
      // Calculate angle of the last segment to place the label along it
      let angle = Math.atan2(lastVertex.y - prevVertex.y, lastVertex.x - prevVertex.x) * (180 / Math.PI);
      if (angle > 90) angle -= 180;
      else if (angle < -90) angle += 180;

      // Position the label slightly above the last segment, near the end vertex
      // Or simply put it right at the end vertex
      
      return (
          <g transform={`translate(${lastVertex.x} ${lastVertex.y})`}>
             <rect 
                x={-40/zoom} y={10/zoom} width={80/zoom} height={20/zoom} rx={4/zoom}
                fill="white" opacity="0.8" className="pointer-events-none"
             />
             <text
                 x={0}
                 y={24 / zoom}
                 fontSize={12 / zoom}
                 fontWeight="bold"
                 fontFamily="sans-serif"
                 fill={color}
                 textAnchor="middle"
                 className="pointer-events-none"
             >
                 {labelText}
             </text>
          </g>
      );
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 ${tool === 'distance' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        className="w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4">
            <circle cx="5" cy="5" r="5" fill="currentColor" />
          </marker>
        </defs>

        <AnnotationLayer 
          annotations={(typeof allAnnotations !== 'undefined' ? allAnnotations : annotations).filter(a => a.pageNumber === pageNumber)}
          zoom={zoom}
          selectedAnnotationId={selectedAnnotationId}
          tool={tool}
          handleAnnotationPointerDown={handleAnnotationPointerDown}
          handleResizePointerDown={typeof handleResizePointerDown !== 'undefined' ? handleResizePointerDown : () => {}}
          pixelsPerInch={typeof pixelsPerInch !== 'undefined' ? pixelsPerInch : 72}
        />

        {isDrawing && currentVertices.length > 0 && (
          <g color={strokeColor}>
            <polyline
                points={renderPolyline(currentVertices, currentMousePos)}
                fill="none"
                stroke={strokeColor}
                strokeWidth={borderWidth / zoom}
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            {currentVertices.length > 0 && currentMousePos && renderMeasurementLabel(
                [...currentVertices, currentMousePos], 
                calculateTotalDistancePx([...currentVertices, currentMousePos]), 
                unit, precision, strokeColor
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function DistanceToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          const totalPx = calculateTotalDistancePx(ann.vertices);
          
          return (
            <g key={ann.id} color={ann.strokeColor}>
              {/* Invisible large hit area */}
              <polyline
                points={renderPolyline(ann.vertices)}
                fill="none"
                stroke="transparent"
                strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              <polyline
                points={renderPolyline(ann.vertices)}
                fill="none"
                stroke={ann.strokeColor}
                strokeWidth={ann.borderWidth / zoom}
                strokeLinejoin="round"
                strokeLinecap="round"
                markerStart="url(#dot)"
                markerMid="url(#dot)"
                markerEnd="url(#dot)"
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              
              {renderMeasurementLabel(ann.vertices, totalPx, ann.unit, ann.precision, ann.strokeColor)}

              {isSelected && tool === 'select' && ann.vertices.map((v, idx) => (
                  <circle
                    key={idx}
                    cx={v.x}
                    cy={v.y}
                    r={6 / zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={2 / zoom}
                    className="resize-handle pointer-events-auto cursor-move"
                    onPointerDown={(e) => handleResizePointerDown(e, ann, idx)}
                  />
              ))}
            </g>
          );
        
}

export default function DistanceMeasurementPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('distance');
  const [strokeColor, setStrokeColor] = useState('#22c55e');
  const [borderWidth, setBorderWidth] = useState(2);
  const [unit, setUnit] = useState('in');
  const [precision, setPrecision] = useState(2);
  
  // Global Scale Ratio: pixels per inch. Default: 72 pixels = 1 inch (PDF standard).
  const [pixelsPerInch, setPixelsPerInch] = useState(72);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);

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
      <Toolbar tool={tool} setTool={setTool} 
        strokeColor={strokeColor} setStrokeColor={setStrokeColor}
        borderWidth={borderWidth} setBorderWidth={setBorderWidth}
        unit={unit} setUnit={setUnit}
        precision={precision} setPrecision={setPrecision}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} updateAnnotation={updateAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
        onPdfUpload={onPdfUpload} onDownloadPdf={handleDownloadPdf} onBack={onBack} onToggleComments={() => setIsCommentPanelOpen(prev => !prev)}
        onOpenCalibration={() => setCalibrationModalOpen(true)}
      />
      <div className="flex-1 overflow-auto p-4 pt-24 pb-20 flex justify-center">
        <div className="relative transition-transform origin-top flex flex-col items-center" style={{ transform: `scale(${zoom})` }}>
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            className="w-full flex flex-col items-center gap-6"
          >
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative bg-white shadow-xl">
                  <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} />
                  <DrawingBoard
                    pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                    updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                    tool={tool} 
                    strokeColor={strokeColor} 
                    borderWidth={borderWidth}
                    unit={unit}
                    precision={precision}
                    pixelsPerInch={pixelsPerInch}
                  />
                </div>
              ))}
            </Document>
        </div>
      </div>
      <CalibrationModal 
        isOpen={calibrationModalOpen}
        onClose={() => setCalibrationModalOpen(false)}
        onCalibrate={setPixelsPerInch}
      />
    </div>
  );
}

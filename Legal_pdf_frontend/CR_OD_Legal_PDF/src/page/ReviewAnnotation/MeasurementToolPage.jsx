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
  Ruler, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, Settings2, MessageSquare
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

function formatMeasurement(distancePx, pixelsPerInch, unit, precision) {
  const inches = distancePx / pixelsPerInch;
  const realDistance = inches / unitToInches[unit];
  return `${realDistance.toFixed(precision)} ${unit}`;
}

export const renderMeasurementLabel = (startX, startY, endX, endY, labelText, zoom, strokeColor) => {
  const cx = (startX + endX) / 2;
  const cy = (startY + endY) / 2;
  let angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);
  if (angle > 90 || angle < -90) {
      angle += 180;
  }

  return (
      <text
          x={cx}
          y={cy - 8 / zoom}
          fontSize={14 / zoom}
          fontWeight="bold"
          fontFamily="sans-serif"
          fill={strokeColor}
          textAnchor="middle"
          alignmentBaseline="bottom"
          transform={`rotate(${angle} ${cx} ${cy})`}
          className="pointer-events-none drop-shadow-md"
          style={{ textShadow: `0px 0px ${4/zoom}px white` }}
      >
          {labelText}
      </text>
  );
};


// ==========================================
// COMPONENTS
// ==========================================
function CalibrationModal({ isOpen, onClose, selectedAnnotation, onCalibrate, currentUnit }) {
  const [inputValue, setInputValue] = useState('');
  
  if (!isOpen) return null;

  const handleCalibrate = () => {
    if (!selectedAnnotation) return;
    const val = parseFloat(inputValue);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }
    const distPx = calculateDistance(selectedAnnotation.startX, selectedAnnotation.startY, selectedAnnotation.endX, selectedAnnotation.endY);
    const realInches = val * unitToInches[currentUnit];
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
        {selectedAnnotation ? (
          <>
            <p className="text-sm text-gray-600">
              Enter the real-world length for the selected line.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Real-world length (in current unit)</label>
              <input 
                type="number" 
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. 10.5"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCalibrate()}
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">
            Please draw and select a measurement line first to calibrate the scale.
          </p>
        )}
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 font-medium">Cancel</button>
          <button 
            onClick={handleCalibrate} 
            disabled={!selectedAnnotation}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            Calibrate
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
        <button onClick={() => setTool('measurement')} className={`p-2 rounded-xl transition-all ${tool === 'measurement' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Measurement Tool"><Ruler size={20} /></button>
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
  const [currentLine, setCurrentLine] = useState(null);
  
  const [isDraggingWhole, setIsDraggingWhole] = useState(false);
  const [dragOffsetWhole, setDragOffsetWhole] = useState({ x: 0, y: 0 });
  
  const [isResizingStart, setIsResizingStart] = useState(false);
  const [isResizingEnd, setIsResizingEnd] = useState(false);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.resize-handle') || (tool === 'select' && e.target.tagName !== 'svg' && e.target.tagName !== 'line' && e.target.tagName !== 'text')) {
      return;
    }

    if (tool === 'select' && (e.target.tagName === 'svg' || e.target.tagName === 'DIV')) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'measurement') {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentLine({
        startX: coords.x,
        startY: coords.y,
        endX: coords.x,
        endY: coords.y,
      });
      setSelectedAnnotationId(null);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setDragOffsetWhole({ x: coords.x - ann.startX, y: coords.y - ann.startY });
      setIsDraggingWhole(true);
    }
  };

  const handleResizeStartPointerDown = (e, ann) => {
    e.stopPropagation();
    setSelectedAnnotationId(ann.id);
    setIsResizingStart(true);
  };

  const handleResizeEndPointerDown = (e, ann) => {
    e.stopPropagation();
    setSelectedAnnotationId(ann.id);
    setIsResizingEnd(true);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);

      if (isDrawing && currentLine) {
        setCurrentLine(prev => ({ ...prev, endX: coords.x, endY: coords.y }));
      } else if (isDraggingWhole && selectedAnnotationId) {
        const ann = annotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          const dx = ann.endX - ann.startX;
          const dy = ann.endY - ann.startY;
          updateAnnotation(selectedAnnotationId, {
            startX: coords.x - dragOffsetWhole.x,
            startY: coords.y - dragOffsetWhole.y,
            endX: coords.x - dragOffsetWhole.x + dx,
            endY: coords.y - dragOffsetWhole.y + dy,
          });
        }
      } else if (isResizingStart && selectedAnnotationId) {
        updateAnnotation(selectedAnnotationId, { startX: coords.x, startY: coords.y });
      } else if (isResizingEnd && selectedAnnotationId) {
        updateAnnotation(selectedAnnotationId, { endX: coords.x, endY: coords.y });
      }
    };

    const handlePointerUp = () => {
      if (isDrawing && currentLine) {
        if (currentLine.startX !== currentLine.endX || currentLine.startY !== currentLine.endY) {
          const newId = uuidv4();
          addAnnotation({
            id: newId,
            type: 'measurement',
            pageNumber,
            ...currentLine,
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
        setCurrentLine(null);
      }
      setIsDraggingWhole(false);
      setIsResizingStart(false);
      setIsResizingEnd(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    isDrawing, currentLine, isDraggingWhole, dragOffsetWhole, 
    isResizingStart, isResizingEnd, selectedAnnotationId,
    getCanvasCoordinates, addAnnotation, updateAnnotation, annotations,
    pageNumber, strokeColor, borderWidth, unit, precision
  ]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 ${tool === 'measurement' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
    >
      <svg
        className="w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker>
        </defs>

        <AnnotationLayer 
          annotations={annotations.filter(a => a.pageNumber === pageNumber)}
          zoom={zoom}
          selectedAnnotationId={selectedAnnotationId}
          tool={tool}
          handleAnnotationPointerDown={handleAnnotationPointerDown}
          handleResizeStartPointerDown={handleResizeStartPointerDown}
          handleResizeEndPointerDown={handleResizeEndPointerDown}
          pixelsPerInch={pixelsPerInch}
        />

        {isDrawing && currentLine && (
            <g>
                <line
                    x1={currentLine.startX} y1={currentLine.startY}
                    x2={currentLine.endX} y2={currentLine.endY}
                    stroke={strokeColor} strokeWidth={borderWidth / zoom}
                    markerStart="url(#arrow)" markerEnd="url(#arrow)"
                />
                {renderMeasurementLabel(
                    currentLine.startX, currentLine.startY, 
                    currentLine.endX, currentLine.endY, 
                    formatMeasurement(calculateDistance(currentLine.startX, currentLine.startY, currentLine.endX, currentLine.endY), pixelsPerInch, unit, precision),
                    zoom, strokeColor
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

export function MeasurementToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          const distPx = calculateDistance(ann.startX, ann.startY, ann.endX, ann.endY);
          const labelText = formatMeasurement(distPx, pixelsPerInch, ann.unit, ann.precision);

          return (
            <g key={ann.id}>
              {/* Invisible large hit area */}
              <line
                x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY}
                stroke="transparent" strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              
              <line
                x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY}
                stroke={ann.strokeColor} strokeWidth={ann.borderWidth / zoom}
                markerStart="url(#arrow)" markerEnd="url(#arrow)"
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />

              {renderMeasurementLabel(ann.startX, ann.startY, ann.endX, ann.endY, labelText, zoom, ann.strokeColor)}
              
              {isSelected && tool === 'select' && (
                <>
                  <circle
                    cx={ann.startX} cy={ann.startY} r={6 / zoom}
                    fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom}
                    className="resize-handle pointer-events-auto cursor-move"
                    onPointerDown={(e) => handleResizeStartPointerDown(e, ann)}
                  />
                  <circle
                    cx={ann.endX} cy={ann.endY} r={6 / zoom}
                    fill="#3b82f6" stroke="#ffffff" strokeWidth={2 / zoom}
                    className="resize-handle pointer-events-auto cursor-move"
                    onPointerDown={(e) => handleResizeEndPointerDown(e, ann)}
                  />
                </>
              )}
            </g>
          );
        
}

export default function MeasurementToolPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('measurement');
  const [strokeColor, setStrokeColor] = useState('#eab308');
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
        selectedAnnotation={annotations.find(a => a.id === selectedAnnotationId)}
        onCalibrate={setPixelsPerInch}
        currentUnit={unit}
      />
    </div>
  );
}

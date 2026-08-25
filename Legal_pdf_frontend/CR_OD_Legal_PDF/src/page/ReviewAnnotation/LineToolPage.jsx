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
  Minus, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
} from 'lucide-react';

const ext = pdfjs.version >= '4' ? 'mjs' : 'js';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.${ext}`;

// ==========================================
// UTILS
// ==========================================
function hexToRgb(hex) {
  if (hex === 'transparent') return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor,
  borderWidth, setBorderWidth, opacity, setOpacity,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#4f46e5'];

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
        <button onClick={() => setTool('line')} className={`p-2 rounded-xl transition-all ${tool === 'line' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Line Tool"><Minus size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* STROKE COLOR */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-gray-500 w-8">Color</span>
        {colors.map(c => (
          <button key={`s-${c}`} onClick={() => {
            setStrokeColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strokeColor: c });
          }} className={`w-6 h-6 rounded-full border border-gray-300 transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>

      <div className="flex flex-col gap-2 w-32 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Width</span>
          <input type="range" min="1" max="15" step="1" value={borderWidth} onChange={(e) => {
            const val = Number(e.target.value);
            setBorderWidth(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { borderWidth: val });
          }} className="w-full cursor-pointer accent-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Opacity</span>
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
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, borderWidth,
  opacity, pageNumber
}) {
  const containerRef = useRef(null);
  
  // Interaction States
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
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
    if (e.target.closest('.resize-handle') || (tool === 'select' && e.target.tagName !== 'svg' && e.target.tagName !== 'DIV')) {
      return;
    }

    if (tool === 'select' && (e.target.tagName === 'svg' || e.target.tagName === 'DIV')) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'line') {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setIsDrawing(true);
      setCurrentLine({ startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y });
      setSelectedAnnotationId(null);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      // Offset relative to the start point of the line
      setDragOffset({ x: coords.x - ann.startX, y: coords.y - ann.startY });
      setIsDragging(true);
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
        setCurrentLine({ ...currentLine, endX: coords.x, endY: coords.y });
      } else if (isDragging && selectedAnnotationId) {
        const ann = annotations.find(a => a.id === selectedAnnotationId);
        if (ann) {
          const dx = (coords.x - dragOffset.x) - ann.startX;
          const dy = (coords.y - dragOffset.y) - ann.startY;
          updateAnnotation(selectedAnnotationId, {
            startX: ann.startX + dx,
            startY: ann.startY + dy,
            endX: ann.endX + dx,
            endY: ann.endY + dy,
          });
        }
      } else if (isResizingStart && selectedAnnotationId) {
        updateAnnotation(selectedAnnotationId, {
          startX: coords.x,
          startY: coords.y,
        });
      } else if (isResizingEnd && selectedAnnotationId) {
        updateAnnotation(selectedAnnotationId, {
          endX: coords.x,
          endY: coords.y,
        });
      }
    };

    const handlePointerUp = () => {
      if (isDrawing && currentLine) {
        const dx = currentLine.endX - currentLine.startX;
        const dy = currentLine.endY - currentLine.startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 10) { // minimum length to be created
          const newId = uuidv4();
          addAnnotation({
            id: newId,
            type: 'line',
            pageNumber,
            startX: currentLine.startX,
            startY: currentLine.startY,
            endX: currentLine.endX,
            endY: currentLine.endY,
            strokeColor,
            borderWidth,
            opacity,
            createdDate: new Date().toISOString(),
            visibility: true,
          });
          setSelectedAnnotationId(newId);
        }
      }
      
      setIsDrawing(false);
      setCurrentLine(null);
      setIsDragging(false);
      setIsResizingStart(false);
      setIsResizingEnd(false);
    };

    if (isDrawing || isDragging || isResizingStart || isResizingEnd) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    isDrawing, currentLine, isDragging, dragOffset, 
    isResizingStart, isResizingEnd, selectedAnnotationId,
    getCanvasCoordinates, addAnnotation, updateAnnotation, annotations,
    pageNumber, strokeColor, borderWidth, opacity
  ]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 ${tool === 'line' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
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

        {isDrawing && currentLine && (
          <line
            x1={currentLine.startX}
            y1={currentLine.startY}
            x2={currentLine.endX}
            y2={currentLine.endY}
            stroke={strokeColor}
            strokeWidth={borderWidth / zoom}
            opacity={opacity}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function LineToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          return (
            <g key={ann.id}>
              {/* Invisible large hit area for easier selection */}
              <line
                x1={ann.startX}
                y1={ann.startY}
                x2={ann.endX}
                y2={ann.endY}
                stroke="transparent"
                strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              <line
                x1={ann.startX}
                y1={ann.startY}
                x2={ann.endX}
                y2={ann.endY}
                stroke={ann.strokeColor}
                strokeWidth={ann.borderWidth / zoom}
                opacity={ann.opacity}
                strokeLinecap="round"
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              
              {isSelected && tool === 'select' && (
                <>
                  <circle
                    cx={ann.startX}
                    cy={ann.startY}
                    r={6 / zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={2 / zoom}
                    className="resize-handle pointer-events-auto cursor-move"
                    onPointerDown={(e) => handleResizeStartPointerDown(e, ann)}
                  />
                  <circle
                    cx={ann.endX}
                    cy={ann.endY}
                    r={6 / zoom}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={2 / zoom}
                    className="resize-handle pointer-events-auto cursor-move"
                    onPointerDown={(e) => handleResizeEndPointerDown(e, ann)}
                  />
                </>
              )}
            </g>
          );
        
}

export default function LineToolPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('line');
  const [strokeColor, setStrokeColor] = useState('#4f46e5'); // Default indigo stroke
  const [borderWidth, setBorderWidth] = useState(3);
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
      <Toolbar tool={tool} setTool={setTool} 
        strokeColor={strokeColor} setStrokeColor={setStrokeColor}
        borderWidth={borderWidth} setBorderWidth={setBorderWidth}
        opacity={opacity} setOpacity={setOpacity}
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
                  <DrawingBoard
                    pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                    updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                    tool={tool} 
                    strokeColor={strokeColor} 
                    borderWidth={borderWidth} opacity={opacity}
                  />
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

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
  Hexagon, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
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


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor, fillColor, setFillColor,
  borderWidth, setBorderWidth, opacity, setOpacity,
  borderStyle, setBorderStyle, joinStyle, setJoinStyle,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#4f46e5'];
  const fillColors = ['transparent', '#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#4f46e5'];

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
        <button onClick={() => setTool('polygon')} className={`p-2 rounded-xl transition-all ${tool === 'polygon' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Polygon Tool"><Hexagon size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* STROKE COLOR */}
      <div className="flex flex-col gap-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 w-8">Stroke</span>
            {colors.map(c => (
            <button key={`s-${c}`} onClick={() => {
                setStrokeColor(c);
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strokeColor: c });
            }} className={`w-5 h-5 rounded-full border border-gray-300 transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 w-8">Fill</span>
            {fillColors.map(c => (
            <button key={`f-${c}`} onClick={() => {
                setFillColor(c);
                if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { fillColor: c });
            }} className={`w-5 h-5 rounded-full border border-gray-300 transition-transform ${fillColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c === 'transparent' ? '#f3f4f6' : c }} title={c === 'transparent' ? 'Transparent' : c}>
                {c === 'transparent' && <span className="text-[8px] leading-none text-gray-400 block -rotate-45">/</span>}
            </button>
            ))}
          </div>
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>

      {/* STYLES AND JOINS */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
            <select value={borderStyle} onChange={(e) => {
              setBorderStyle(e.target.value);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { borderStyle: e.target.value });
            }} className="text-xs border rounded p-1">
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
            </select>
            <select value={joinStyle} onChange={(e) => {
              setJoinStyle(e.target.value);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { joinStyle: e.target.value });
            }} className="text-xs border rounded p-1">
                <option value="miter">Miter Join</option>
                <option value="round">Round Join</option>
                <option value="bevel">Bevel Join</option>
            </select>
        </div>
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
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, fillColor, borderWidth,
  opacity, borderStyle, joinStyle, pageNumber
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
    if (e.target.closest('.resize-handle') || (tool === 'select' && e.target.tagName !== 'svg' && e.target.tagName !== 'polygon')) {
      return;
    }

    if (tool === 'select' && (e.target.tagName === 'svg' || e.target.tagName === 'DIV')) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'polygon') {
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

  const handleDoubleClick = (e) => {
    if (tool === 'polygon' && isDrawing) {
      if (currentVertices.length > 2) {
        const newId = uuidv4();
        addAnnotation({
          id: newId,
          type: 'polygon',
          pageNumber,
          vertices: [...currentVertices],
          strokeColor,
          fillColor,
          borderWidth,
          opacity,
          borderStyle,
          joinStyle,
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
        if (e.key === 'Enter' && isDrawing && currentVertices.length > 2) {
            handleDoubleClick();
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
    pageNumber, strokeColor, fillColor, borderWidth, opacity, borderStyle, joinStyle, dragStartVertices
  ]);

  const getStrokeDashArray = (style, width) => {
      const w = width / zoom;
      if (style === 'dashed') return `${w * 4}, ${w * 4}`;
      if (style === 'dotted') return `${w}, ${w * 2}`;
      return "none";
  }

  const renderPolygon = (vertices, previewCoord) => {
      if (!vertices || vertices.length === 0) return null;
      let points = vertices.map(v => `${v.x},${v.y}`).join(' ');
      if (previewCoord) {
          points += ` ${previewCoord.x},${previewCoord.y}`;
      }
      return points;
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 ${tool === 'polygon' ? 'cursor-crosshair' : 'cursor-default'}`}
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
          <polygon
            points={renderPolygon(currentVertices, currentMousePos)}
            fill={fillColor === 'transparent' ? 'none' : fillColor}
            stroke={strokeColor}
            strokeWidth={borderWidth / zoom}
            opacity={opacity}
            strokeLinejoin={joinStyle}
            strokeDasharray={getStrokeDashArray(borderStyle, borderWidth)}
          />
        )}
      </svg>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function PolygonToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          return (
            <g key={ann.id}>
              {/* Invisible large hit area for easier selection */}
              <polygon
                points={renderPolygon(ann.vertices)}
                fill={ann.fillColor === 'transparent' ? 'rgba(0,0,0,0)' : ann.fillColor}
                stroke="transparent"
                strokeWidth={Math.max(20 / zoom, ann.borderWidth / zoom + 10)}
                strokeLinejoin={ann.joinStyle}
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              <polygon
                points={renderPolygon(ann.vertices)}
                fill={ann.fillColor}
                stroke={ann.strokeColor}
                strokeWidth={ann.borderWidth / zoom}
                opacity={ann.opacity}
                strokeLinejoin={ann.joinStyle}
                strokeDasharray={getStrokeDashArray(ann.borderStyle, ann.borderWidth)}
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              />
              
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

export default function PolygonToolPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('polygon');
  const [strokeColor, setStrokeColor] = useState('#4f46e5');
  const [fillColor, setFillColor] = useState('transparent');
  const [borderWidth, setBorderWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [borderStyle, setBorderStyle] = useState('solid');
  const [joinStyle, setJoinStyle] = useState('miter');
  
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
        fillColor={fillColor} setFillColor={setFillColor}
        borderWidth={borderWidth} setBorderWidth={setBorderWidth}
        opacity={opacity} setOpacity={setOpacity}
        borderStyle={borderStyle} setBorderStyle={setBorderStyle}
        joinStyle={joinStyle} setJoinStyle={setJoinStyle}
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
                    fillColor={fillColor}
                    borderWidth={borderWidth} opacity={opacity}
                    borderStyle={borderStyle} joinStyle={joinStyle}
                  />
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

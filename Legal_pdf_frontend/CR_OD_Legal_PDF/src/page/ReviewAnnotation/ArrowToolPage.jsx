import React, { useState, useCallback, useRef, useContext } from 'react';
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
  ArrowRight, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Copy, ClipboardPaste, Lock, Unlock, Upload, Download, ArrowLeft, MessageSquare
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


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth,
  opacity, setOpacity, undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7'];
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
      <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
      <div className="flex items-center gap-2">
        <button onClick={() => setTool('arrow')} className={`p-2 rounded-xl transition-all ${tool === 'arrow' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Arrow Tool"><ArrowRight size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
      <div className="flex items-center gap-2">
        {colors.map(c => (
          <button key={c} onClick={() => setStrokeColor(c)} className={`w-6 h-6 rounded-full transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
        <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-7 h-7 p-0 border-0 rounded overflow-hidden cursor-pointer" />
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex flex-col gap-2 w-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Width</span>
          <input type="range" min="2" max="30" value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-full cursor-pointer accent-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Opacity</span>
          <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full cursor-pointer accent-blue-500" />
        </div>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
      <div className="flex items-center gap-2">
        <button onClick={undo} disabled={!canUndo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Undo"><Undo2 size={20} /></button>
        <button onClick={redo} disabled={!canRedo} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Redo"><Redo2 size={20} /></button>
        <button onClick={() => deleteAnnotation(selectedAnnotationId)} disabled={!selectedAnnotationId} className="p-2 rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all" title="Delete Selected"><Trash2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
      <div className="flex items-center gap-2">
        <button onClick={zoomOut} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom Out"><ZoomOut size={20} /></button>
        <button onClick={resetZoom} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Reset Zoom"><Maximize size={20} /></button>
        <button onClick={zoomIn} className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all" title="Zoom In"><ZoomIn size={20} /></button>
      </div>
    </div>
  );
}

function DrawingBoard({
  annotations, addAnnotation, updateAnnotation, selectedAnnotationId,
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, strokeWidth,
  opacity, pageNumber
}) {
  const containerRef = useRef(null);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

    if (tool === 'arrow') {
      setIsDrawing(true);
      setCurrentStroke({
        id: uuidv4(),
        type: 'arrow',
        pageNumber,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color: strokeColor,
        width: strokeWidth,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });
    } else if (tool === 'select' && e.target.tagName !== 'line' && e.target.tagName !== 'polygon') {
      setSelectedAnnotationId(null);
    }
  };

  const handlePointerMove = (e) => {
    if (isDrawing && currentStroke && currentStroke.type === 'arrow') {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      setCurrentStroke((prev) => ({
        ...prev,
        endX: x,
        endY: y,
      }));
    }
  };

  const handlePointerUp = (e) => {
    if (isDrawing && currentStroke) {
      setIsDrawing(false);
      if (currentStroke.type === 'arrow' && (currentStroke.startX !== currentStroke.endX || currentStroke.startY !== currentStroke.endY)) {
        addAnnotation(currentStroke);
      }
      setCurrentStroke(null);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
    }
  };

  const handleContextMenu = (e) => e.preventDefault();
  const allAnnotations = currentStroke ? [...annotations, currentStroke] : annotations;

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${tool === 'arrow' ? 'cursor-crosshair' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onContextMenu={handleContextMenu}
      style={{ touchAction: 'none' }}
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

export function ArrowToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          if (ann.type === 'arrow') {
            const { p1, p2, p3, shaftEndX, shaftEndY } = getArrowHeadPoints(ann.startX, ann.startY, ann.endX, ann.endY, ann.width);
            return (
              <g 
                key={ann.id} 
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
                opacity={ann.opacity}
              >
                {/* Invisible thicker line for easier clicking/selection */}
                <line x1={ann.startX} y1={ann.startY} x2={ann.endX} y2={ann.endY} stroke="transparent" strokeWidth={Math.max(20, ann.width * 2)} />
                <line x1={ann.startX} y1={ann.startY} x2={shaftEndX} y2={shaftEndY} stroke={ann.color} strokeWidth={ann.width} />
                <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={ann.color} />
                {isSelected && (
                  <rect 
                    x={Math.min(ann.startX, ann.endX) - 10} 
                    y={Math.min(ann.startY, ann.endY) - 10} 
                    width={Math.abs(ann.endX - ann.startX) + 20} 
                    height={Math.abs(ann.endY - ann.startY) + 20} 
                    fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" 
                  />
                )}
              </g>
            );
          }
          return null;
        
}

export default function ArrowToolPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('arrow');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(8);
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
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} opacity={opacity} setOpacity={setOpacity}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
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
                      tool={tool} strokeColor={strokeColor} strokeWidth={strokeWidth} opacity={opacity}
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

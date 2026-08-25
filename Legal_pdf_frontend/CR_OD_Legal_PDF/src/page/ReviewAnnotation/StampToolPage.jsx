import React, { useState, useCallback, useRef, useContext } from 'react';
import { downloadAnnotationsPdf } from './utils/pdfExport';
import AnnotationLayer from './AnnotationLayer';
import PdfUploader from './PdfUploader';
import { AnnotationContext } from './context/AnnotationContext';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Stamp, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
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


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, strokeColor, setStrokeColor, stampText, setStampText,
  isCustom, setIsCustom, customText, setCustomText,
  opacity, setOpacity, stampWidth, setStampWidth, stampRotation, setStampRotation,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#000000', '#a855f7'];
  const stamps = ['APPROVED', 'REJECTED', 'CONFIDENTIAL', 'DRAFT', 'REVIEWED'];

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
        <button onClick={() => setTool('stamp')} className={`p-2 rounded-xl transition-all ${tool === 'stamp' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Stamp Tool"><Stamp size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* Stamp Selection Dropdown */}
      <div className="flex items-center gap-2 shrink-0 w-max">
        <select 
          value={isCustom ? "CUSTOM" : stampText} 
          onChange={(e) => { 
            const val = e.target.value;
            if (val === "CUSTOM") {
              setIsCustom(true);
              setStampText(customText);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: customText });
            } else {
              setIsCustom(false);
              setStampText(val);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: val });
            }
            setTool('stamp'); 
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2 outline-none font-bold cursor-pointer"
        >
          {stamps.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="CUSTOM">Custom...</option>
        </select>
        
        {isCustom && (
          <input 
            type="text" 
            value={customText}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setCustomText(val);
              const finalVal = val || ' ';
              setStampText(finalVal);
              if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { text: finalVal });
            }}
            placeholder="TYPE HERE"
            maxLength={20}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2 outline-none font-bold uppercase"
          />
        )}
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block"></div>
      <div className="flex items-center gap-2">
        {colors.map(c => (
          <button key={c} onClick={() => {
            setStrokeColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: c });
          }} className={`w-6 h-6 rounded-full transition-transform ${strokeColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex flex-col gap-2 w-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Width</span>
          <input type="range" min="100" max="400" step="10" value={stampWidth} onChange={(e) => {
            const val = Number(e.target.value);
            setStampWidth(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { width: val, height: val * 0.32 });
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Rotate</span>
          <input type="range" min="-180" max="180" step="5" value={stampRotation} onChange={(e) => {
            const val = Number(e.target.value);
            setStampRotation(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { rotation: val });
          }} className="w-full cursor-pointer accent-blue-500" />
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
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, stampText, stampWidth, stampRotation,
  opacity, pageNumber
}) {
  const containerRef = useRef(null);
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

    if (tool === 'stamp') {
      // Place a new stamp immediately
      addAnnotation({
        id: uuidv4(),
        type: 'stamp',
        pageNumber,
        text: stampText,
        x,
        y,
        width: stampWidth,
        height: stampWidth * 0.32,
        rotation: stampRotation,
        color: strokeColor,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });
      // Automatically switch to select tool after placing
      // In a real app we might leave it on stamp, but auto-switching prevents accidental multi-stamping.
    } else if (tool === 'select' && e.target.tagName !== 'rect' && e.target.tagName !== 'text') {
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
      setDragOffset({
        x: x - ann.x,
        y: y - ann.y
      });
    }
  };

  const handlePointerMove = (e) => {
    if (isDragging && draggingAnnId) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      updateAnnotation(draggingAnnId, {
        x: x - dragOffset.x,
        y: y - dragOffset.y
      });
    }
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      setDraggingAnnId(null);
    }
  };

  const handleContextMenu = (e) => e.preventDefault();

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${tool === 'stamp' ? 'cursor-crosshair' : 'cursor-default'}`}
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

export function StampToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          if (ann.type === 'stamp') {
            const rx = ann.width / 2;
            const ry = ann.height / 2;
            const rectX = ann.x - rx;
            const rectY = ann.y - ry;

            return (
              <g 
                key={ann.id} 
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-move' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
                opacity={ann.opacity}
                transform={`rotate(${ann.rotation || 0}, ${ann.x}, ${ann.y})`}
              >
                <rect 
                  x={rectX} y={rectY} width={ann.width} height={ann.height} 
                  fill="transparent" stroke={ann.color} strokeWidth={8} 
                />
                <text 
                  x={ann.x} y={ann.y} 
                  fill={ann.color} 
                  fontSize={`${ann.width * 0.168}`} 
                  fontWeight="900" 
                  fontFamily="sans-serif" 
                  textAnchor="middle" 
                  dominantBaseline="central"
                  style={{ userSelect: 'none' }}
                >
                  {ann.text}
                </text>
                {isSelected && (
                  <rect 
                    x={rectX - 10} 
                    y={rectY - 10} 
                    width={ann.width + 20} 
                    height={ann.height + 20} 
                    fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" 
                  />
                )}
              </g>
            );
          }
          return null;
        
}

export default function StampToolPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('stamp');
  const [strokeColor, setStrokeColor] = useState('#ef4444'); // Default red for stamps
  const [stampText, setStampText] = useState('APPROVED');
  const [isCustom, setIsCustom] = useState(false);
  const [customText, setCustomText] = useState('CUSTOM');
  const [stampWidth, setStampWidth] = useState(250);
  const [stampRotation, setStampRotation] = useState(0);
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
        stampText={stampText} setStampText={setStampText} 
        isCustom={isCustom} setIsCustom={setIsCustom} customText={customText} setCustomText={setCustomText}
        opacity={opacity} setOpacity={setOpacity}
        stampWidth={stampWidth} setStampWidth={setStampWidth}
        stampRotation={stampRotation} setStampRotation={setStampRotation}
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
                      tool={tool} strokeColor={strokeColor} stampText={stampText} stampWidth={stampWidth} stampRotation={stampRotation} opacity={opacity}
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

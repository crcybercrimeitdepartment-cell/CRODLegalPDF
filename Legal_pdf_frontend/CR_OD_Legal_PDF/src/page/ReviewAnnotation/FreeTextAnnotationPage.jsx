import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import { downloadAnnotationsPdf } from './utils/pdfExport';
import AnnotationLayer from './AnnotationLayer';
import PdfUploader from './PdfUploader';
import { AnnotationContext } from './context/AnnotationContext';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  AlignLeft, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
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
  tool, setTool, textColor, setTextColor,
  fontSize, setFontSize, opacity, setOpacity,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#6b7280'];

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
        <button onClick={() => setTool('freetext')} className={`p-2 rounded-xl transition-all ${tool === 'freetext' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Free Text Tool"><AlignLeft size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      {/* TEXT COLOR */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-semibold text-gray-500 w-8">Text</span>
        {colors.map(c => (
          <button key={`t-${c}`} onClick={() => {
            setTextColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { textColor: c });
          }} className={`w-6 h-6 rounded-full border border-gray-300 transition-transform ${textColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>

      <div className="flex flex-col gap-2 w-32 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 font-medium shrink-0 w-8">Size</span>
          <input type="range" min="10" max="72" step="1" value={fontSize} onChange={(e) => {
            const val = Number(e.target.value);
            setFontSize(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { fontSize: val });
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
  setSelectedAnnotationId, zoom, pan, tool, textColor,
  fontSize, opacity, pageNumber
}) {
  const containerRef = useRef(null);
  const textareaRefs = useRef({});
  
  // Interaction States
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState(null);
  const [resizeStartSize, setResizeStartSize] = useState(null);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  const handlePointerDown = (e) => {
    const isOverlay = e.target.closest('.freetext-overlay');
    const isResizeHandle = e.target.closest('.resize-handle');
    
    if (isResizeHandle) return;
    
    if (tool === 'select' && !isOverlay) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'freetext' && !isOverlay) {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      const newId = uuidv4();
      addAnnotation({
        id: newId,
        type: 'freetext',
        pageNumber,
        x: coords.x,
        y: coords.y,
        w: 250, // default width for wrapping
        h: 40,  // default min-height
        text: '',
        textColor,
        fontSize,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });
      setSelectedAnnotationId(newId);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    e.stopPropagation();
    
    if (selectedAnnotationId !== ann.id) {
      setSelectedAnnotationId(ann.id);
      if (tool === 'select') {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
        setIsDragging(true);
        e.preventDefault(); 
      }
    }
  };

  const handleResizePointerDown = (e, ann) => {
    e.stopPropagation();
    setSelectedAnnotationId(ann.id);
    const coords = getCanvasCoordinates(e.clientX, e.clientY);
    setIsResizing(true);
    setResizeStart(coords);
    setResizeStartSize({ w: ann.w, h: ann.h });
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);

      if (isDragging && selectedAnnotationId) {
        updateAnnotation(selectedAnnotationId, {
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y
        });
      } else if (isResizing && selectedAnnotationId && resizeStart && resizeStartSize) {
        const dx = coords.x - resizeStart.x;
        const dy = coords.y - resizeStart.y;
        updateAnnotation(selectedAnnotationId, {
          w: Math.max(50, resizeStartSize.w + dx),
          h: Math.max(30, resizeStartSize.h + dy)
        });
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeStart(null);
      setResizeStartSize(null);
    };

    if (isDragging || isResizing) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [
    isDragging, dragOffset, 
    isResizing, resizeStart, resizeStartSize, selectedAnnotationId,
    getCanvasCoordinates, updateAnnotation
  ]);

  // Auto-focus textarea when selected
  useEffect(() => {
    if (selectedAnnotationId && textareaRefs.current[selectedAnnotationId]) {
      textareaRefs.current[selectedAnnotationId].focus();
    }
  }, [selectedAnnotationId]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 z-20 ${tool === 'freetext' ? 'cursor-text' : 'cursor-default'}`}
      onPointerDown={handlePointerDown}
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
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================

export function FreeTextToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

        
        
        return (
          <div 
            key={ann.id}
            className={`freetext-overlay absolute ${isSelected ? 'ring-1 ring-blue-400 ring-dashed z-30' : 'z-20'}`}
            style={{ 
              left: `${ann.x}px`, 
              top: `${ann.y}px`,
              width: `${ann.w}px`,
              height: `${ann.h}px`,
              opacity: ann.opacity
            }}
            onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
          >
            {isSelected && (
              <div 
                className="absolute -top-6 left-[-1px] bg-blue-500 text-white rounded-t px-2 py-0.5 text-[10px] uppercase font-bold cursor-move shadow-md opacity-90 hover:opacity-100 z-50 flex items-center"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const coords = getCanvasCoordinates(e.clientX, e.clientY);
                  setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
                  setIsDragging(true);
                }}
              >
                Move
              </div>
            )}
            <textarea
              ref={(el) => textareaRefs.current[ann.id] = el}
              className={`w-full h-full resize-none outline-none bg-transparent ${isSelected ? 'cursor-text pointer-events-auto' : 'pointer-events-none'}`}
              style={{
                color: ann.textColor,
                fontSize: `${ann.fontSize}px`,
                padding: '4px',
                lineHeight: '1.2'
              }}
              value={ann.text}
              onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
              readOnly={!isSelected}
              placeholder={isSelected ? "Type text here..." : ""}
            />
            {isSelected && (
              <div 
                className="resize-handle absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize rounded-full opacity-80 hover:opacity-100 transform translate-x-1/2 translate-y-1/2 shadow-sm"
                onPointerDown={(e) => handleResizePointerDown(e, ann)}
              />
            )}
          </div>
        );
      
}

export default function FreeTextAnnotationPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('freetext');
  const [textColor, setTextColor] = useState('#ef4444');
  const [fontSize, setFontSize] = useState(16);
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
        textColor={textColor} setTextColor={setTextColor}
        fontSize={fontSize} setFontSize={setFontSize}
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
                    textColor={textColor} 
                    fontSize={fontSize} opacity={opacity}
                  />
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

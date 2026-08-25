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
  Strikethrough as StrikeIcon, MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize, Upload, Download, ArrowLeft, MessageSquare
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
  tool, setTool, strokeColor, setStrokeColor,
  strikeoutStyle, setStrikeoutStyle, strokeWidth, setStrokeWidth,
  opacity, setOpacity,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#000000', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7'];

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
        <button onClick={() => setTool('strikeout')} className={`p-2 rounded-xl transition-all ${tool === 'strikeout' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Strikeout Tool"><StrikeIcon size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      <div className="flex items-center gap-2 shrink-0 w-max">
        <select 
          value={strikeoutStyle} 
          onChange={(e) => {
            const val = e.target.value;
            setStrikeoutStyle(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { strikeoutStyle: val });
            setTool('strikeout');
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2 outline-none font-medium cursor-pointer"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
          <option value="double">Double</option>
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
          <input type="range" min="1" max="10" step="1" value={strokeWidth} onChange={(e) => {
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
  setSelectedAnnotationId, zoom, pan, tool, strokeColor, strikeoutStyle, strokeWidth,
  opacity, pageNumber
}) {
  const containerRef = useRef(null);

  // Handle Text Selection for Strikeout
  useEffect(() => {
    const handleMouseUp = () => {
      if (tool !== 'strikeout') return;
      
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      if (!selection.anchorNode || !selection.anchorNode.parentElement) return;
      if (!selection.anchorNode.parentElement.closest('.react-pdf__Page')) return;

      const range = selection.getRangeAt(0);
      const clientRects = Array.from(range.getClientRects());
      if (clientRects.length === 0) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const textString = selection.toString();

      // Convert all screen rects to SVG coordinate rects
      const svgRects = clientRects.map(r => ({
        x: (r.left - containerRect.left - pan.x) / zoom,
        y: (r.top - containerRect.top - pan.y) / zoom,
        w: r.width / zoom,
        h: r.height / zoom
      }));

      addAnnotation({
        id: uuidv4(),
        type: 'strikeout',
        pageNumber,
        text: textString,
        rects: svgRects,
        color: strokeColor,
        strikeoutStyle: strikeoutStyle,
        width: strokeWidth,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });

      // Clear the native selection immediately
      selection.removeAllRanges();
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [tool, zoom, pan, strokeColor, strikeoutStyle, strokeWidth, opacity, addAnnotation, pageNumber]);

  const handlePointerDown = (e) => {
    if (tool === 'select' && e.target.tagName === 'svg') {
      setSelectedAnnotationId(null);
    }
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden z-20 ${tool === 'strikeout' ? 'pointer-events-none' : 'pointer-events-auto'}`}
      onPointerDown={handlePointerDown}
    >
      <svg
        className="w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
          pointerEvents: tool === 'strikeout' ? 'none' : 'auto'
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

export function StrikeoutToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown, handleResizePointerDown, pixelsPerInch }) {

          
          
          if (ann.type === 'strikeout') {
            return (
              <g 
                key={ann.id} 
                className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`}
                onPointerDown={(e) => handleAnnotationPointerDown(e, ann)}
              >
                {ann.rects.map((r, i) => {
                  const lineY = r.y + r.h / 2; // Center of text
                  
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
                    <line 
                      key={i}
                      x1={r.x} y1={lineY} x2={r.x + r.w} y2={lineY} 
                      stroke={ann.color} strokeWidth={ann.width} 
                      strokeDasharray={strokeDasharray}
                      strokeLinecap={strokeLinecap}
                      opacity={ann.opacity}
                    />
                  );
                })}
                
                {/* Invisible thicker path over the rects to make selection easier since lines are thin */}
                {ann.rects.map((r, i) => (
                  <rect key={`hit_${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill="transparent" />
                ))}
                
                {isSelected && ann.rects.length > 0 && (
                  <g>
                    {ann.rects.map((r, i) => (
                      <rect 
                        key={`sel_${i}`}
                        x={r.x - 2} y={r.y - 2} width={r.w + 4} height={r.h + 4} 
                        fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" 
                      />
                    ))}
                  </g>
                )}
              </g>
            );
          }
          return null;
        
}

export default function StrikeoutTextPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('strikeout');
  const [strokeColor, setStrokeColor] = useState('#ef4444'); // Default red
  const [strikeoutStyle, setStrikeoutStyle] = useState('solid');
  const [strokeWidth, setStrokeWidth] = useState(2);
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
        strikeoutStyle={strikeoutStyle} setStrikeoutStyle={setStrikeoutStyle}
        strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth}
        opacity={opacity} setOpacity={setOpacity}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} updateAnnotation={updateAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
        onPdfUpload={onPdfUpload} onDownloadPdf={handleDownloadPdf} onBack={onBack} onToggleComments={() => setIsCommentPanelOpen(prev => !prev)}
      />
      <div className={`flex-1 overflow-auto p-4 pt-24 pb-20 flex justify-center selection:bg-red-200 selection:bg-opacity-40 ${tool === 'strikeout' ? 'cursor-text' : ''}`}>
        <div className="relative transition-transform origin-top flex flex-col items-center" style={{ transform: `scale(${zoom})` }}>
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-6">
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative bg-white shadow-xl">
                  {/* renderTextLayer={true} IS CRUCIAL HERE */}
                  <Page pageNumber={index + 1} renderTextLayer={true} renderAnnotationLayer={false} />
                  <DrawingBoard
                    pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                    updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                    tool={tool} strokeColor={strokeColor} strokeWidth={strokeWidth} strikeoutStyle={strikeoutStyle} opacity={opacity}
                  />
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

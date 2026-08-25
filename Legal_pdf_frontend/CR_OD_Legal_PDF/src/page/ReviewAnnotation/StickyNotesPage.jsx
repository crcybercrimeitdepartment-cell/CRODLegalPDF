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
  MessageSquare, MessageCircle, HelpCircle, Key, 
  CheckCircle, XCircle, Star, Info,
  MousePointer2, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Maximize,
  Upload, Download, ArrowLeft, Type
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

const ICON_MAP = {
  'Note': MessageSquare,
  'Comment': MessageCircle,
  'Help': HelpCircle,
  'Key': Key,
  'Check': CheckCircle,
  'Cross': XCircle,
  'Star': Star,
  'Info': Info,
};

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


// ==========================================
// COMPONENTS
// ==========================================
function Toolbar({
  tool, setTool, iconColor, setIconColor,
  iconType, setIconType, opacity, setOpacity,
  undo, redo, canUndo, canRedo, selectedAnnotationId,
  deleteAnnotation, updateAnnotation, zoomIn, zoomOut, resetZoom, onPdfUpload, onDownloadPdf, onBack
, onToggleComments}) {
  const colors = ['#eab308', '#ef4444', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#6b7280'];

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
        <button onClick={() => setTool('sticky')} className={`p-2 rounded-xl transition-all ${tool === 'sticky' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Sticky Note Tool"><MessageSquare size={20} /></button>
        <button onClick={() => setTool('select')} className={`p-2 rounded-xl transition-all ${tool === 'select' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'hover:bg-gray-100 text-gray-600'}`} title="Select Tool"><MousePointer2 size={20} /></button>
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      
      <div className="flex items-center gap-2 shrink-0 w-max">
        <select 
          value={iconType} 
          onChange={(e) => {
            const val = e.target.value;
            setIconType(val);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { iconType: val });
            setTool('sticky');
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2 outline-none font-medium cursor-pointer"
        >
          {Object.keys(ICON_MAP).map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        {colors.map(c => (
          <button key={c} onClick={() => {
            setIconColor(c);
            if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: c });
          }} className={`w-6 h-6 rounded-full transition-transform ${iconColor === c ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'}`} style={{ backgroundColor: c }} title={c} />
        ))}
        <input type="color" value={iconColor} onChange={(e) => {
          setIconColor(e.target.value);
          if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { color: e.target.value });
        }} className="w-7 h-7 p-0 border-0 rounded overflow-hidden cursor-pointer" />
      </div>
      <div className="w-px h-8 bg-gray-300 hidden md:block shrink-0"></div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-500 font-medium shrink-0 w-12">Opacity</span>
        <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => {
          const val = Number(e.target.value);
          setOpacity(val);
          if (selectedAnnotationId) updateAnnotation(selectedAnnotationId, { opacity: val });
        }} className="w-24 cursor-pointer accent-blue-500" />
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
  setSelectedAnnotationId, zoom, pan, tool, iconColor, iconType, opacity, pageNumber
}) {
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const textareaRef = useRef(null);

  const getCanvasCoordinates = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  }, [pan, zoom]);

  const handlePointerDown = (e) => {
    if (e.target.closest('.sticky-popup')) {
      return;
    }

    if (tool === 'select' && !e.target.closest('g')) {
      setSelectedAnnotationId(null);
      return;
    }

    if (tool === 'sticky') {
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      const newId = uuidv4();
      addAnnotation({
        id: newId,
        type: 'sticky',
        pageNumber,
        x: coords.x,
        y: coords.y,
        text: '',
        iconType,
        color: iconColor,
        opacity,
        createdDate: new Date().toISOString(),
        visibility: true,
      });
      setSelectedAnnotationId(newId);
      setToolToSelectAfterDrop();
    }
  };

  const setToolToSelectAfterDrop = () => {
    // Fire a custom event to tell parent to switch tool (handled in parent or we just rely on explicit selection)
    // For simplicity, we just keep the tool as sticky if they want to drop more, but selecting it auto-opens it.
  };

  const handleAnnotationPointerDown = (e, ann) => {
    if (tool === 'select') {
      e.stopPropagation();
      setSelectedAnnotationId(ann.id);
      const coords = getCanvasCoordinates(e.clientX, e.clientY);
      setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (isDragging && selectedAnnotationId) {
        const coords = getCanvasCoordinates(e.clientX, e.clientY);
        updateAnnotation(selectedAnnotationId, {
          x: coords.x - dragOffset.x,
          y: coords.y - dragOffset.y
        });
      }
    };
    const handlePointerUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, selectedAnnotationId, dragOffset, updateAnnotation, getCanvasCoordinates]);
  
  // Focus text area automatically when selected
  useEffect(() => {
    if (selectedAnnotationId && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [selectedAnnotationId]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden z-20 ${tool === 'sticky' ? 'cursor-crosshair' : 'cursor-default'}`}
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
          pixelsPerInch={72}
        />
      </svg>
      
      {/* HTML OVERLAY for popups */}
      {annotations.filter(ann => ann.visibility && ann.pageNumber === pageNumber && selectedAnnotationId === ann.id).map((ann) => {
        // Position popup near the icon
        const popupLeft = (ann.x * zoom) + pan.x + 16;
        const popupTop = (ann.y * zoom) + pan.y + 16;
        
        return (
          <div 
            key={`popup-${ann.id}`}
            className="sticky-popup absolute bg-white shadow-2xl border border-gray-200 rounded-xl flex flex-col z-50 w-64 animate-in fade-in zoom-in duration-200"
            style={{ 
              left: `${popupLeft}px`, 
              top: `${popupTop}px`,
            }}
            onPointerDown={(e) => e.stopPropagation()} // Prevent selecting canvas when clicking popup
          >
            <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200 rounded-t-xl">
              <div className="flex items-center gap-2">
                {React.createElement(ICON_MAP[ann.iconType] || MessageSquare, { size: 14, color: ann.color })}
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{ann.iconType} Note</span>
              </div>
              <button 
                onClick={() => setSelectedAnnotationId(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle size={16} />
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={ann.text}
              onChange={(e) => updateAnnotation(ann.id, { text: e.target.value })}
              placeholder="Type your comment here..."
              className="w-full h-32 p-3 text-sm text-gray-800 bg-transparent outline-none resize-none"
            />
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 rounded-b-xl flex justify-end">
              <span className="text-[10px] text-gray-400">Will be printed on PDF</span>
            </div>
          </div>
        )
      })}
    </div>
  );
}

// ==========================================
// MAIN COMPONENT EXPORT
// ==========================================
export function StickyNoteToolRenderer({ ann, zoom, isSelected, tool, handleAnnotationPointerDown }) {
  if (ann.type !== 'sticky' && ann.type !== 'stickynote') return null;
  const Icon = ICON_MAP[ann.iconType] || MessageSquare;
  const iconSize = 24; 
  
  return (
    <g 
      key={ann.id} 
      className={`pointer-events-auto ${tool === 'select' ? 'cursor-pointer' : ''}`}
      onPointerDown={(e) => handleAnnotationPointerDown && handleAnnotationPointerDown(e, ann)}
      transform={`translate(${ann.x - iconSize/2}, ${ann.y - iconSize/2})`}
    >
      <rect x="0" y="0" width={iconSize} height={iconSize} rx="4" fill="white" opacity={ann.opacity} />
      <foreignObject x="0" y="0" width={iconSize} height={iconSize}>
        <div xmlns="http://www.w3.org/1999/xhtml" className="w-full h-full flex items-center justify-center">
          <Icon size={20} color={ann.color} style={{ opacity: ann.opacity }} strokeWidth={2.5} />
        </div>
      </foreignObject>

      {isSelected && (
        <rect x="-2" y="-2" width={iconSize + 4} height={iconSize + 4} fill="none" stroke="#3b82f6" strokeWidth={2 / zoom} strokeDasharray="4" rx="6" />
      )}
    </g>
  );
}

export default function StickyNotesPage({ onBack }) {
  const { file, setFile, numPages, setNumPages, setIsCommentPanelOpen } = useContext(AnnotationContext);
  const {
    annotations, selectedAnnotationId, setSelectedAnnotationId, addAnnotation, updateAnnotation,
    deleteAnnotation, undo, redo, canUndo, canRedo,
  } = useContext(AnnotationContext);

  const [tool, setTool] = useState('select');
  const [iconColor, setIconColor] = useState('#eab308'); // Yellow
  const [iconType, setIconType] = useState('Note');
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
      <Toolbar tool={tool} setTool={setTool} iconColor={iconColor} setIconColor={setIconColor}
        iconType={iconType} setIconType={setIconType} opacity={opacity} setOpacity={setOpacity}
        undo={undo} redo={redo} canUndo={canUndo} canRedo={canRedo} selectedAnnotationId={selectedAnnotationId}
        deleteAnnotation={deleteAnnotation} updateAnnotation={updateAnnotation} zoomIn={zoomIn} zoomOut={zoomOut} resetZoom={resetZoom}
        onPdfUpload={onPdfUpload} onDownloadPdf={handleDownloadPdf} onBack={onBack} onToggleComments={() => setIsCommentPanelOpen(prev => !prev)}
      />
      <div className="flex-1 overflow-auto p-4 pt-24 pb-20 flex justify-center">
        <div className="relative transition-transform origin-top flex flex-col items-center" style={{ transform: `scale(${zoom})` }}>
          <Document file={file} onLoadSuccess={onDocumentLoadSuccess} className="flex flex-col gap-6">
              {Array.from(new Array(numPages), (el, index) => (
                <div key={`page_${index + 1}`} className="relative bg-white shadow-xl">
                  {/* renderTextLayer={false} for sticky tool as we don't need text selection */}
                  <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} />
                  <DrawingBoard
                    pageNumber={index + 1} annotations={annotations} addAnnotation={addAnnotation}
                    updateAnnotation={updateAnnotation} selectedAnnotationId={selectedAnnotationId}
                    setSelectedAnnotationId={setSelectedAnnotationId} zoom={zoom} pan={{ x: 0, y: 0 }}
                    tool={tool} iconColor={iconColor} iconType={iconType} opacity={opacity}
                  />
                </div>
              ))}
            </Document>
          
        </div>
      </div>
    </div>
  );
}

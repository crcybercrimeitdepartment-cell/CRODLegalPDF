import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { pdfjs as pdfjsLib } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set worker to unpkg to avoid Vite build issues with Web Workers
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export default function CropPdfPage() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFlying, setIsFlying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Crop Options
  const [cropMode, setCropMode] = useState('manual');
  const [pageOpt, setPageOpt] = useState('all');
  const [customPages, setCustomPages] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // PDF & Canvas State
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [pdfScale, setPdfScale] = useState(1);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  
  // UI Crop Box (in pixels relative to canvas)
  const [cropBox, setCropBox] = useState({ x: 20, y: 20, w: 200, h: 300 });
  // PDF Crop Box (in PDF points)
  const [pdfCrop, setPdfCrop] = useState({ left: 0, top: 0, right: 0, bottom: 0 });

  // Dragging State
  const dragState = useRef({ isDragging: false, isResizing: false, handle: null, startX: 0, startY: 0, startBox: {} });

  // Render First Page for Visual Crop
  useEffect(() => {
    if (files.length === 0) return;

    const renderPDF = async () => {
      try {
        const fileBuffer = await files[0].arrayBuffer();
        
        // Use imported pdfjsLib
        const pdf = await pdfjsLib.getDocument({ data: fileBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport1 = page.getViewport({ scale: 1 });
        const renderScale = 2; // high-res render
        const viewport = page.getViewport({ scale: renderScale });
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.objectFit = 'contain';
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        // Wait for CSS layout
        setTimeout(() => {
            const container = canvas.parentElement;
            if(!container) return;
            const cw = container.clientWidth;
            const ch = container.clientHeight;
            
            let fitRatio = Math.min(cw / viewport.width, ch / viewport.height);
            if (fitRatio > 1) fitRatio = 1;
            
            const cWidth = viewport.width * fitRatio;
            const cHeight = viewport.height * fitRatio;
            
            setCanvasDimensions({ width: cWidth, height: cHeight });
            setPdfScale(viewport1.width / cWidth);
            
            // Set initial crop box to leave a 5% margin
            const mX = cWidth * 0.05;
            const mY = cHeight * 0.05;
            setCropBox({
              x: mX,
              y: mY,
              w: cWidth - (mX * 2),
              h: cHeight - (mY * 2)
            });
        }, 100);
      } catch (err) {
         console.error("PDF Render Error", err);
      }
    };
    renderPDF();
  }, [files]);

  // Sync Box to PDF Points
  useEffect(() => {
    setPdfCrop({
      left: Math.round(cropBox.x * pdfScale),
      top: Math.round(cropBox.y * pdfScale),
      right: Math.round((cropBox.x + cropBox.w) * pdfScale),
      bottom: Math.round((cropBox.y + cropBox.h) * pdfScale)
    });
  }, [cropBox, pdfScale]);

  // Sync Points to Box (when user types in advanced inputs)
  const handlePdfCropInput = (field, value) => {
    const num = parseInt(value) || 0;
    const newPdfCrop = { ...pdfCrop, [field]: num };
    setPdfCrop(newPdfCrop);
    setCropBox({
        x: newPdfCrop.left / pdfScale,
        y: newPdfCrop.top / pdfScale,
        w: (newPdfCrop.right - newPdfCrop.left) / pdfScale,
        h: (newPdfCrop.bottom - newPdfCrop.top) / pdfScale
    });
  };

  // Pointer Events for Dragging/Resizing Crop Box
  const onPointerDown = (e, handle) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    dragState.current = {
      isDragging: !handle,
      isResizing: !!handle,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...cropBox }
    };
  };

  const onPointerMove = (e) => {
    const state = dragState.current;
    if (!state.isDragging && !state.isResizing) return;
    
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    
    if (state.isDragging) {
      let nx = state.startBox.x + dx;
      let ny = state.startBox.y + dy;
      
      if (nx < 0) nx = 0;
      if (ny < 0) ny = 0;
      if (nx + state.startBox.w > canvasDimensions.width) nx = canvasDimensions.width - state.startBox.w;
      if (ny + state.startBox.h > canvasDimensions.height) ny = canvasDimensions.height - state.startBox.h;
      
      setCropBox({ ...state.startBox, x: nx, y: ny });
    } else if (state.isResizing) {
      let { x, y, w, h } = state.startBox;
      
      if (state.handle.includes('w')) { x += dx; w -= dx; }
      if (state.handle.includes('e')) { w += dx; }
      if (state.handle.includes('n')) { y += dy; h -= dy; }
      if (state.handle.includes('s')) { h += dy; }
      
      if (w < 20) { if (state.handle.includes('w')) x -= (20 - w); w = 20; }
      if (h < 20) { if (state.handle.includes('n')) y -= (20 - h); h = 20; }
      
      setCropBox({ x, y, w, h });
    }
  };

  const onPointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    dragState.current.isDragging = false;
    dragState.current.isResizing = false;
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  
  const handleDragLeave = () => setIsDragOver(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (validFiles.length > 0) setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
    if (files.length - 1 === 0) {
      setIsSuccess(false);
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setIsSuccess(false);
  };

  const parsePageRange = (rangeStr, totalPages) => {
    const pages = new Set();
    const parts = rangeStr.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-');
        const s = parseInt(start);
        const e = parseInt(end);
        if (!isNaN(s) && !isNaN(e)) {
          for (let i = s; i <= e; i++) {
            if (i >= 1 && i <= totalPages) pages.add(i - 1);
          }
        }
      } else {
        const p = parseInt(trimmed);
        if (!isNaN(p) && p >= 1 && p <= totalPages) pages.add(p - 1);
      }
    }
    return Array.from(pages);
  };

  // Processing
  const processDocument = async (fileBuffer) => {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();
    
    let pagesToCrop = [];
    if (pageOpt === 'all') {
      pagesToCrop = pages;
    } else if (pageOpt === 'current') {
      pagesToCrop = [pages[0]];
    } else if (pageOpt === 'odd') {
      pagesToCrop = pages.filter((_, i) => (i + 1) % 2 !== 0);
    } else if (pageOpt === 'even') {
      pagesToCrop = pages.filter((_, i) => (i + 1) % 2 === 0);
    } else if (pageOpt === 'custom') {
       const p = parsePageRange(customPages, pages.length);
       pagesToCrop = p.map(idx => pages[idx]);
    }
    
    for (const page of pagesToCrop) {
      if(!page) continue;
      const { height: originalHeight } = page.getSize();
      
      const cropX = pdfCrop.left;
      const cropW = pdfCrop.right - pdfCrop.left;
      const cropH = pdfCrop.bottom - pdfCrop.top;
      const cropY = originalHeight - pdfCrop.bottom; 
      
      page.setCropBox(cropX, cropY, cropW, cropH);
    }
    return await pdfDoc.save();
  };

  const handleProcess = async () => {
    if (files.length === 0) return;
    setIsFlying(true);
    
    setTimeout(async () => {
      setIsProcessing(true);
      try {
        for (const file of files) {
          const fileBuffer = await file.arrayBuffer();
          const processedBytes = await processDocument(fileBuffer);
          const blob = new Blob([processedBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `cropped_${file.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsSuccess(true);
      } catch (err) {
        console.error(err);
        alert("Error cropping PDF.");
      } finally {
        setIsProcessing(false);
        setIsFlying(false);
      }
    }, 500);
  };

  // Styling for crop handles
  const handleStyle = "absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow cursor-pointer hover:bg-indigo-50 transition-colors";

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-transparent relative z-20 min-h-screen flex flex-col items-center">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-1/2 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
      
      <div className="w-full max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mt-8 mb-8 px-4">
          <h1 className="text-2xl sm:text-4xl font-black text-[#1e2a52] leading-tight mb-3">
            Crop PDF
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
            Draw a rectangle on the document to visually crop margins. Fast, secure, and professional.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start w-full">
          {/* Left Column (Upload and Preview) */}
          <div className="w-full lg:max-w-2xl flex flex-col gap-6 mx-auto lg:mx-0 transition-all duration-500">
            <div className="bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden flex-1">
              <div
                className={`upload-zone relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 border-indigo-200 bg-indigo-50/30 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-inner group flex flex-col justify-center min-h-[300px] ${isDragOver ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input type="file" accept=".pdf" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
                <div className="w-20 h-20 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110 group-hover:-translate-y-1">
                  <svg className="w-10 h-10 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <p className="drop-text text-xl font-bold text-slate-800 mb-2 transition-colors group-hover:text-indigo-900">
                  {files.length > 0 ? `${files.length} File(s) selected` : 'Drag & drop a PDF here'}
                </p>
                {files.length === 0 && <p className="text-sm text-slate-500">or <span className="font-semibold text-indigo-600 group-hover:underline">click to browse</span></p>}
              </div>

              {files.length > 0 && (
                <div className="file-list mt-6 space-y-3">
                  {files.map((file, index) => (
                    <div key={index} className="file-item flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                          <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <span className="font-medium text-slate-700 truncate">{file.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(index); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove file">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Visual Crop Interface */}
              {files.length > 0 && (
                <div className="preview-section mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden h-[400px] sm:h-[500px] lg:h-[600px] flex flex-col items-center justify-center shadow-inner w-full relative touch-none select-none">
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                     <div 
                        className="relative shadow-xl"
                        style={{ width: canvasDimensions.width || '100%', height: canvasDimensions.height || '100%' }}
                     >
                         <canvas ref={canvasRef} className="absolute inset-0 bg-white" style={{ display: 'block' }}></canvas>
                         
                         {/* Crop Box Overlay Mask */}
                         <div className="absolute inset-0 bg-slate-900/40 pointer-events-none mix-blend-multiply"></div>
                         
                         {/* Draggable Crop Box */}
                         <div 
                            className="absolute border-[3px] border-indigo-500 cursor-move"
                            style={{ 
                                left: cropBox.x, 
                                top: cropBox.y, 
                                width: cropBox.w, 
                                height: cropBox.h,
                                boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                                clipPath: 'inset(0 -9999px -9999px -9999px)'
                            }}
                            onPointerDown={(e) => onPointerDown(e, null)}
                            onPointerMove={onPointerMove}
                            onPointerUp={onPointerUp}
                         >
                            {/* Inner Grid Lines */}
                            <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-indigo-300/70 pointer-events-none"></div>
                            <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-indigo-300/70 pointer-events-none"></div>
                            <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-indigo-300/70 pointer-events-none"></div>
                            <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-indigo-300/70 pointer-events-none"></div>
                            
                            {/* Handles */}
                            <div className={`${handleStyle} -top-2 -left-2 cursor-nwse-resize`} onPointerDown={(e) => onPointerDown(e, 'nw')}></div>
                            <div className={`${handleStyle} -top-2 left-1/2 -ml-2 cursor-ns-resize`} onPointerDown={(e) => onPointerDown(e, 'n')}></div>
                            <div className={`${handleStyle} -top-2 -right-2 cursor-nesw-resize`} onPointerDown={(e) => onPointerDown(e, 'ne')}></div>
                            <div className={`${handleStyle} top-1/2 -right-2 -mt-2 cursor-ew-resize`} onPointerDown={(e) => onPointerDown(e, 'e')}></div>
                            <div className={`${handleStyle} -bottom-2 -right-2 cursor-nwse-resize`} onPointerDown={(e) => onPointerDown(e, 'se')}></div>
                            <div className={`${handleStyle} -bottom-2 left-1/2 -ml-2 cursor-ns-resize`} onPointerDown={(e) => onPointerDown(e, 's')}></div>
                            <div className={`${handleStyle} -bottom-2 -left-2 cursor-nesw-resize`} onPointerDown={(e) => onPointerDown(e, 'sw')}></div>
                            <div className={`${handleStyle} top-1/2 -left-2 -mt-2 cursor-ew-resize`} onPointerDown={(e) => onPointerDown(e, 'w')}></div>
                         </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Options) */}
          {files.length > 0 && !isProcessing && !isSuccess && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden mx-auto lg:mx-0 transition-all duration-500 animate-fade-in-up">
              
              <div className="space-y-6">
                
                {/* Mode Settings */}
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Crop Settings</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setCropMode('manual')} className={`p-4 rounded-xl border-2 text-left transition-all ${cropMode === 'manual' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200'}`}>
                        <div className="font-bold text-sm mb-1">Visual Crop</div>
                        <div className="text-xs opacity-80">Draw rectangle</div>
                    </button>
                    <button onClick={() => setCropMode('auto')} className={`p-4 rounded-xl border-2 text-left transition-all ${cropMode === 'auto' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 hover:border-slate-200 opacity-50 cursor-not-allowed'}`} disabled title="Auto Margin not available locally yet">
                        <div className="font-bold text-sm mb-1">Auto Crop</div>
                        <div className="text-xs opacity-80">Detect margins</div>
                    </button>
                  </div>
                </div>

                {/* Apply To */}
                <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Apply Crop To</h3>
                  
                  <div className="flex flex-col gap-2">
                    {['all', 'current', 'odd', 'even', 'custom'].map((opt) => (
                      <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                        <input type="radio" checked={pageOpt === opt} onChange={() => setPageOpt(opt)} className="w-4 h-4 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 border-gray-300" />
                        <span className="text-sm font-semibold text-slate-700 capitalize">{opt === 'current' ? 'Current Page' : `${opt} Pages`}</span>
                      </label>
                    ))}
                    {pageOpt === 'custom' && (
                        <input type="text" value={customPages} onChange={e => setCustomPages(e.target.value)} placeholder="e.g. 1, 3, 5-8" className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                    )}
                  </div>
                </div>

                {/* Advanced Points */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-semibold text-slate-700">Advanced Coordinates</span>
                        <svg className={`w-5 h-5 text-slate-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {showAdvanced && (
                        <div className="p-5 pt-0 grid grid-cols-2 gap-4 border-t border-slate-100 mt-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Left (pt)</label>
                                <input type="number" value={pdfCrop.left} onChange={e => handlePdfCropInput('left', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Top (pt)</label>
                                <input type="number" value={pdfCrop.top} onChange={e => handlePdfCropInput('top', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Right (pt)</label>
                                <input type="number" value={pdfCrop.right} onChange={e => handlePdfCropInput('right', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Bottom (pt)</label>
                                <input type="number" value={pdfCrop.bottom} onChange={e => handlePdfCropInput('bottom', e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                            </div>
                        </div>
                    )}
                </div>

                <button 
                  onClick={handleProcess} 
                  disabled={isFlying}
                  className={`w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl shadow-xl shadow-indigo-200 transform transition-all duration-500 flex items-center justify-center gap-2 group mt-8 relative overflow-hidden ${isFlying ? 'scale-95 opacity-80' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  <span className={`transition-all duration-500 ${isFlying ? '-translate-x-4 opacity-0' : ''}`}>Apply Crop</span>
                  <svg className={`w-5 h-5 absolute right-1/4 transition-all duration-500 ease-in-out ${isFlying ? 'translate-x-[200px] -translate-y-[100px] opacity-0 scale-150 rotate-45' : 'group-hover:translate-x-1 opacity-0 group-hover:opacity-100'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  <svg className={`w-5 h-5 transition-all duration-500 ${isFlying ? 'translate-x-[200px] -translate-y-[100px] opacity-0 scale-150' : 'group-hover:translate-x-1'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in-up min-h-[400px]">
                            <div className="speeder-loader-wrapper mb-8">
                <div className="loader">
                  <span>
                    <span></span>
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <div className="base">
                    <span></span>
                    <div className="face"></div>
                  </div>
                </div>
                <div className="longfazers">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Processing Document</h3>
              <p className="text-slate-500 text-center text-sm">Please wait while we crop your files...</p>
            </div>
          )}

          {isSuccess && !isProcessing && (
            <div className="w-full lg:max-w-md bg-white/70 backdrop-blur-xl border border-white shadow-2xl rounded-3xl p-10 flex flex-col items-center justify-center relative overflow-hidden animate-fade-in-up min-h-[400px]">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-12 h-12 text-emerald-500 drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Done!</h3>
              <p className="text-slate-500 text-center mb-8 font-medium">Your files have been successfully cropped.</p>
              
              <button onClick={() => alert('Downloading...')} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95 flex justify-center items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Download
              </button>
              <button onClick={resetAll} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-slate-300 transition-all active:scale-95 flex justify-center items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                Crop more files
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

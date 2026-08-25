import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, Crop, X, Zap, Download, Package, RotateCcw, Image as ImageIcon, ArrowLeft,
  Unlock, Square, Monitor, Tv, Smartphone, Image as PhotoIcon, FileText, Settings
} from 'lucide-react';

const ASPECT_RATIOS = [
  { id: 'free', label: 'Freeform', icon: Unlock },
  { id: '1:1', label: '1:1 Square', icon: Square },
  { id: '4:3', label: '4:3 Standard', icon: Monitor },
  { id: '16:9', label: '16:9 Widescreen', icon: Tv },
  { id: '9:16', label: '9:16 Reel/Story', icon: Smartphone },
  { id: '3:2', label: '3:2 Photo', icon: PhotoIcon },
  { id: '2:3', label: '2:3 Portrait', icon: FileText },
];

const CropImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [currentRatio, setCurrentRatio] = useState('free');
  
  // Crop Box State (DOM Pixels)
  const [boxState, setBoxState] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });
  
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const liveCanvasRef = useRef(null);
  
  // Drag / Resize references to avoid frequent state updates causing lag
  const dragRef = useRef({
    isDragging: false, isResizing: false, handle: null,
    startX: 0, startY: 0, startBoxX: 0, startBoxY: 0, startBoxW: 0, startBoxH: 0
  });

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    const newItems = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      dataUrl: URL.createObjectURL(file),
      origW: 0, origH: 0,
      cropState: null, // { left, top, right, bottom } in original image coordinates
      croppedBlob: null,
      croppedUrl: null
    }));

    setUploadedFiles(prev => {
      const updated = [...prev, ...newItems];
      if (prev.length === 0 && newItems.length > 0) setActiveIndex(0);
      return updated;
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  };

  const removeFile = (e, index) => {
    e.stopPropagation();
    const item = uploadedFiles[index];
    URL.revokeObjectURL(item.dataUrl);
    if (item.croppedUrl) URL.revokeObjectURL(item.croppedUrl);

    setUploadedFiles(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });

    if (uploadedFiles.length - 1 === 0) setActiveIndex(-1);
    else if (activeIndex === index) setActiveIndex(Math.max(0, index - 1));
    else if (activeIndex > index) setActiveIndex(activeIndex - 1);
  };

  const activeFile = activeIndex !== -1 ? uploadedFiles[activeIndex] : null;

  // --- INITIALIZE CROP BOX ---
  const initCropBox = useCallback((imgElement, overrideRatio = null) => {
    if (!activeFile || !imgElement) return;
    const dispW = imgElement.clientWidth;
    const dispH = imgElement.clientHeight;
    if (dispW === 0 || dispH === 0) return;

    setImgDisplaySize({ w: dispW, h: dispH });

    // Update activeFile's original dimensions if not set
    if (activeFile.origW === 0) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].origW = imgElement.naturalWidth;
          up[activeIndex].origH = imgElement.naturalHeight;
        }
        return up;
      });
    }

    const scaleX = dispW / (activeFile.origW || imgElement.naturalWidth);
    const scaleY = dispH / (activeFile.origH || imgElement.naturalHeight);

    let bx, by, bw, bh;

    // Use saved state if it exists and hasn't been reset
    if (activeFile.cropState && !overrideRatio) {
      bx = activeFile.cropState.left * scaleX;
      by = activeFile.cropState.top * scaleY;
      bw = (activeFile.cropState.right - activeFile.cropState.left) * scaleX;
      bh = (activeFile.cropState.bottom - activeFile.cropState.top) * scaleY;
    } else {
      bw = dispW * 0.8;
      bh = dispH * 0.8;
      bx = (dispW - bw) / 2;
      by = (dispH - bh) / 2;
    }

    applyConstraint(bx, by, bw, bh, dispW, dispH, overrideRatio || currentRatio);
  }, [activeFile, activeIndex, currentRatio]);

  const getRatioVal = (ratioStr) => {
    if (ratioStr === 'free') return null;
    const [w, h] = ratioStr.split(':').map(Number);
    return (w > 0 && h > 0) ? w / h : null;
  };

  const applyConstraint = (x, y, w, h, dispW, dispH, ratioStr) => {
    const targetRatio = getRatioVal(ratioStr);
    let finalW = w, finalH = h;
    
    if (targetRatio) {
      if (finalW / finalH > targetRatio) finalW = finalH * targetRatio;
      else finalH = finalW / targetRatio;
      
      if (finalW > dispW) { finalW = dispW; finalH = finalW / targetRatio; }
      if (finalH > dispH) { finalH = dispH; finalW = finalH * targetRatio; }
    }
    
    let finalX = Math.max(0, Math.min(x, dispW - finalW));
    let finalY = Math.max(0, Math.min(y, dispH - finalH));
    
    setBoxState({ x: finalX, y: finalY, w: finalW, h: finalH });
  };

  // --- LIVE CANVAS PREVIEW ---
  useEffect(() => {
    if (!activeFile || !imgRef.current || !liveCanvasRef.current || imgDisplaySize.w === 0) return;
    
    const img = imgRef.current;
    const scaleX = activeFile.origW / imgDisplaySize.w;
    const scaleY = activeFile.origH / imgDisplaySize.h;
    
    const origLeft = Math.max(0, Math.round(boxState.x * scaleX));
    const origTop = Math.max(0, Math.round(boxState.y * scaleY));
    const origRight = Math.min(activeFile.origW, Math.round((boxState.x + boxState.w) * scaleX));
    const origBottom = Math.min(activeFile.origH, Math.round((boxState.y + boxState.h) * scaleY));
    
    const cropW = origRight - origLeft;
    const cropH = origBottom - origTop;

    if (cropW > 0 && cropH > 0) {
      const ctx = liveCanvasRef.current.getContext('2d');
      // Scale down live preview to fit container (e.g. max height 70px)
      const previewRatio = cropW / cropH;
      const previewH = Math.min(70, cropH);
      const previewW = previewH * previewRatio;
      
      liveCanvasRef.current.width = previewW;
      liveCanvasRef.current.height = previewH;
      
      ctx.clearRect(0, 0, previewW, previewH);
      ctx.drawImage(img, origLeft, origTop, cropW, cropH, 0, 0, previewW, previewH);

      // Save to state for backend syncing
      if (!dragRef.current.isDragging && !dragRef.current.isResizing) {
         setUploadedFiles(prev => {
            const up = [...prev];
            if (up[activeIndex]) {
                up[activeIndex].cropState = { left: origLeft, top: origTop, right: origRight, bottom: origBottom };
            }
            return up;
         });
      }
    }
  }, [boxState, imgDisplaySize, activeFile, activeIndex]);

  // --- DRAG & RESIZE LOGIC ---
  const handlePointerDown = (e, handle = null) => {
    if (!activeFile) return;
    e.preventDefault();
    const pos = e.touches ? e.touches[0] : e;
    dragRef.current = {
      isDragging: !handle,
      isResizing: !!handle,
      handle,
      startX: pos.clientX,
      startY: pos.clientY,
      startBoxX: boxState.x,
      startBoxY: boxState.y,
      startBoxW: boxState.w,
      startBoxH: boxState.h
    };

    document.addEventListener('mousemove', handlePointerMove);
    document.addEventListener('mouseup', handlePointerUp);
    document.addEventListener('touchmove', handlePointerMove, { passive: false });
    document.addEventListener('touchend', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    const state = dragRef.current;
    if (!state.isDragging && !state.isResizing) return;
    e.preventDefault();
    
    const pos = e.touches ? e.touches[0] : e;
    const dx = pos.clientX - state.startX;
    const dy = pos.clientY - state.startY;
    
    const dispW = imgDisplaySize.w;
    const dispH = imgDisplaySize.h;
    const targetRatio = getRatioVal(currentRatio);
    
    if (state.isDragging) {
      let newX = Math.max(0, Math.min(state.startBoxX + dx, dispW - state.startBoxW));
      let newY = Math.max(0, Math.min(state.startBoxY + dy, dispH - state.startBoxH));
      setBoxState({ x: newX, y: newY, w: state.startBoxW, h: state.startBoxH });
    } else if (state.isResizing) {
      let newX = state.startBoxX, newY = state.startBoxY;
      let newW = state.startBoxW, newH = state.startBoxH;
      const minSize = 25;

      if (state.handle.includes('e')) newW = Math.max(minSize, state.startBoxW + dx);
      if (state.handle.includes('s')) newH = Math.max(minSize, state.startBoxH + dy);
      if (state.handle.includes('w')) {
        const possibleW = state.startBoxW - dx;
        if (possibleW >= minSize) { newW = possibleW; newX = state.startBoxX + dx; }
      }
      if (state.handle.includes('n')) {
        const possibleH = state.startBoxH - dy;
        if (possibleH >= minSize) { newH = possibleH; newY = state.startBoxY + dy; }
      }

      if (targetRatio) {
        if (state.handle === 'e' || state.handle === 'w') newH = newW / targetRatio;
        else if (state.handle === 'n' || state.handle === 's') newW = newH * targetRatio;
        else {
          if (newW / newH > targetRatio) newW = newH * targetRatio;
          else newH = newW / targetRatio;
        }
      }

      if (newX < 0) { newW += newX; newX = 0; }
      if (newY < 0) { newH += newY; newY = 0; }
      if (newX + newW > dispW) newW = dispW - newX;
      if (newY + newH > dispH) newH = dispH - newY;

      setBoxState({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
    dragRef.current.isResizing = false;
    // Trigger useEffect to save state
    setBoxState(prev => ({ ...prev })); 
    document.removeEventListener('mousemove', handlePointerMove);
    document.removeEventListener('mouseup', handlePointerUp);
    document.removeEventListener('touchmove', handlePointerMove);
    document.removeEventListener('touchend', handlePointerUp);
  };

  // --- ACTIONS ---
  const applyCrop = async () => {
    if (!activeFile || !activeFile.cropState) return;
    setIsProcessing(true);
    
    try {
      // Simulate Backend OR fallback to Canvas
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);

      const cw = activeFile.cropState.right - activeFile.cropState.left;
      const ch = activeFile.cropState.bottom - activeFile.cropState.top;
      
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, activeFile.cropState.left, activeFile.cropState.top, cw, ch, 0, 0, cw, ch);
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].croppedBlob = blob;
          up[activeIndex].croppedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
      }, activeFile.file.type);
      
    } catch(err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    if (activeFile) {
      setUploadedFiles(prev => {
        const up = [...prev];
        up[activeIndex].cropState = null;
        up[activeIndex].croppedBlob = null;
        if (up[activeIndex].croppedUrl) URL.revokeObjectURL(up[activeIndex].croppedUrl);
        up[activeIndex].croppedUrl = null;
        return up;
      });
      setTimeout(() => initCropBox(imgRef.current, 'free'), 50);
    }
  };

  const downloadFile = (blobOrUrl, name) => {
    const a = document.createElement("a");
    a.href = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-20">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Image Source</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-50/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto p-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'}`}>
                        <img src={item.croppedUrl || item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all shadow-md z-10"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Aspect Ratio */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Aspect Ratio</h3>
              <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                {ASPECT_RATIOS.map(ratio => {
                  const Icon = ratio.icon;
                  const isActive = currentRatio === ratio.id;
                  return (
                    <button 
                      key={ratio.id} 
                      onClick={() => { setCurrentRatio(ratio.id); initCropBox(imgRef.current, ratio.id); }}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all ${isActive ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-[inset_0_2px_10px_rgba(59,130,246,0.05)]' : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700'}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {ratio.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 pt-2 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button onClick={applyCrop} disabled={isProcessing} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex justify-center items-center gap-2 shadow-md disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400">
                {isProcessing ? 'Processing...' : <><Crop className="w-4 h-4" /> Apply Crop</>}
              </button>
              <button onClick={resetCrop} className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-800 text-slate-500 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-3.5 h-3.5" /> Reset Crop Box
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Crop className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500 mb-2">No Image Uploaded</h3>
              <p className="text-sm text-center max-w-md text-slate-400">Upload images using the sidebar and use the crop overlay to adjust framing.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-sm text-slate-800 truncate max-w-[150px]">{activeFile.name}</strong>
                  <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold border border-slate-200">Orig: {activeFile.origW}x{activeFile.origH}</span>
                  {activeFile.cropState && (
                    <span className="text-[10px] uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-200">
                      Crop: {activeFile.cropState.right - activeFile.cropState.left}x{activeFile.cropState.bottom - activeFile.cropState.top}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Preview</span>
                    <div className="h-[28px] max-w-[50px] rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                       <canvas ref={liveCanvasRef} className="max-h-full max-w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Viewport */}
              <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] overflow-auto select-none">
                <div className="relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] inline-block max-w-full max-h-[65vh] rounded-sm bg-white ring-1 ring-slate-200 p-2">
                  
                  {/* Image */}
                  {activeFile.croppedUrl ? (
                    <img src={activeFile.croppedUrl} alt="Cropped" className="max-w-full max-h-[65vh] block rounded-sm shadow-md" />
                  ) : (
                    <>
                      <img 
                        ref={imgRef}
                        src={activeFile.dataUrl} 
                        alt="Crop Source" 
                        onLoad={(e) => initCropBox(e.target)}
                        className="max-w-full max-h-[65vh] block rounded-sm" 
                      />
                      
                      {/* Masks */}
                      <div className="absolute bg-slate-900/60 pointer-events-none transition-colors" style={{ top: 0, left: 0, width: '100%', height: boxState.y }} />
                      <div className="absolute bg-slate-900/60 pointer-events-none transition-colors" style={{ top: boxState.y + boxState.h, left: 0, width: '100%', height: imgDisplaySize.h - (boxState.y + boxState.h) }} />
                      <div className="absolute bg-slate-900/60 pointer-events-none transition-colors" style={{ top: boxState.y, left: 0, width: boxState.x, height: boxState.h }} />
                      <div className="absolute bg-slate-900/60 pointer-events-none transition-colors" style={{ top: boxState.y, left: boxState.x + boxState.w, width: imgDisplaySize.w - (boxState.x + boxState.w), height: boxState.h }} />

                      {/* Crop Box */}
                      <div 
                        className="absolute border-2 border-blue-500 shadow-[0_0_0_1px_rgba(255,255,255,0.3)] cursor-move touch-none"
                        style={{ left: boxState.x, top: boxState.y, width: boxState.w, height: boxState.h }}
                        onMouseDown={(e) => handlePointerDown(e)}
                        onTouchStart={(e) => handlePointerDown(e)}
                      >
                        {/* Grid Lines */}
                        <div className="absolute bg-white/30 left-0 right-0 h-[1px]" style={{ top: '33.33%' }} />
                        <div className="absolute bg-white/30 left-0 right-0 h-[1px]" style={{ top: '66.66%' }} />
                        <div className="absolute bg-white/30 top-0 bottom-0 w-[1px]" style={{ left: '33.33%' }} />
                        <div className="absolute bg-white/30 top-0 bottom-0 w-[1px]" style={{ left: '66.66%' }} />

                        {/* Handles */}
                        {['nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'].map(dir => (
                          <div 
                            key={dir}
                            onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e, dir); }}
                            onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e, dir); }}
                            className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full shadow-md ${
                              dir.includes('n') ? '-top-1.5' : dir.includes('s') ? '-bottom-1.5' : 'top-1/2 -translate-y-1/2'
                            } ${
                              dir.includes('w') ? '-left-1.5' : dir.includes('e') ? '-right-1.5' : 'left-1/2 -translate-x-1/2'
                            }`}
                            style={{ cursor: `${dir}-resize` }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {activeFile.croppedBlob ? 'Ready to download result.' : 'Drag crop handles to adjust area'}
                </span>
                <button 
                  onClick={() => downloadFile(activeFile.croppedBlob, `cropped_${activeFile.name}`)}
                  disabled={!activeFile.croppedBlob}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                >
                  <Download className="w-4 h-4" /> Save Cropped Image
                </button>
              </div>
            </>
          )}
        </main>

      </div>
    </div>
  );
};

export default CropImages;

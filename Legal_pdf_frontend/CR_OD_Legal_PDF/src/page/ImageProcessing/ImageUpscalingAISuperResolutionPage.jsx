import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, X, Download, Package, ArrowLeft, Image as ImageIcon,
  Zap, ZoomIn, RotateCcw, MonitorPlay, AlertTriangle, Check
} from 'lucide-react';

const PRESET_SCALES = [
  { value: 2, label: 'Double Resolution' },
  { value: 3, label: 'Triple Resolution' },
  { value: 4, label: 'Quadruple Resolution' }
];

const ImageUpscalingAISuperResolution = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [scaleFactor, setScaleFactor] = useState(2);
  
  // Slider State
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const sliderContainerRef = useRef(null);
  
  const fileInputRef = useRef(null);

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    validFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        alert(`Skipped file "${file.name}": Exceeds maximum 10MB size limit.`);
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setUploadedFiles(prev => {
          const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            size: file.size,
            dataUrl: url,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            scale: 2,
            processedBlob: null,
            processedUrl: null,
          };
          const updated = [...prev, newItem];
          if (prev.length === 0) setActiveIndex(0);
          return updated;
        });
      };
      img.src = url;
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
    if (item.processedUrl) URL.revokeObjectURL(item.processedUrl);

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

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setScaleFactor(activeFile.scale);
      setSliderPosition(50);
    }
  }, [activeIndex]);

  // Sync settings back to active file
  useEffect(() => {
    if (activeFile && activeFile.scale !== scaleFactor) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].scale = scaleFactor;
          // Invalidate processed state if they change scale
          if (up[activeIndex].processedBlob) {
            up[activeIndex].processedBlob = null;
            if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
            up[activeIndex].processedUrl = null;
          }
        }
        return up;
      });
      setSliderPosition(50);
    }
  }, [scaleFactor]);

  // --- SLIDER LOGIC ---
  const handleSliderMove = (e) => {
    if (!isDraggingSlider || !sliderContainerRef.current) return;
    let clientX;
    if (e.touches && e.touches.length > 0) clientX = e.touches[0].clientX;
    else if (e.clientX) clientX = e.clientX;
    else return;

    const rect = sliderContainerRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  useEffect(() => {
    if (isDraggingSlider) {
      window.addEventListener('mousemove', handleSliderMove);
      window.addEventListener('mouseup', () => setIsDraggingSlider(false));
      window.addEventListener('touchmove', handleSliderMove, { passive: false });
      window.addEventListener('touchend', () => setIsDraggingSlider(false));
    }
    return () => {
      window.removeEventListener('mousemove', handleSliderMove);
      window.removeEventListener('mouseup', () => setIsDraggingSlider(false));
      window.removeEventListener('touchmove', handleSliderMove);
      window.removeEventListener('touchend', () => setIsDraggingSlider(false));
    };
  }, [isDraggingSlider]);


  // --- PROCESSING LOGIC ---
  const applyUpscaling = async () => {
    if (!activeFile) return;

    const targetW = activeFile.origW * scaleFactor;
    const targetH = activeFile.origH * scaleFactor;

    if (targetW > 10000 || targetH > 10000) {
      return alert(`Upscaling this image by ${scaleFactor}x would result in dimensions of ${targetW}x${targetH} px, which exceeds the safe limit of 10,000 px. Please select a smaller scale factor.`);
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', activeFile.file);
      
      const stateObj = {
        scale_factor: scaleFactor
      };
      
      formData.append('state', JSON.stringify(stateObj));
      
      const response = await fetch('/api/v1/images/upscale', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Image upscaling failed on the server.');
      }
      
      const blob = await response.blob();
      
      setUploadedFiles(prev => {
        const up = [...prev];
        up[activeIndex].processedBlob = blob;
        up[activeIndex].processedUrl = URL.createObjectURL(blob);
        return up;
      });
      
      setSliderPosition(50);
      setIsProcessing(false);
      
    } catch(err) {
      console.error("Upscaling Error:", err);
      setIsProcessing(false);
      alert("Failed to upscale image: " + err.message);
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

  const saveAllImages = async () => {
    const processed = uploadedFiles.filter(f => f.processedBlob !== null);
    if (processed.length === 0) return alert("No upscaled images available to save.");
    
    if (processed.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === processed[0].id);
      setActiveIndex(idx);
      const nameWithoutExt = processed[0].name.replace(/\.[^/.]+$/, "");
      const ext = processed[0].file.name.substring(processed[0].file.name.lastIndexOf("."));
      setTimeout(() => downloadFile(processed[0].processedBlob, `upscaled_${nameWithoutExt}${ext}`), 100);
      return;
    }
    
    // Fallback: download all individually
    processed.forEach((item, i) => {
      setTimeout(() => {
        const nameWithoutExt = item.name.replace(/\.[^/.]+$/, "");
        const ext = item.file.name.substring(item.file.name.lastIndexOf("."));
        downloadFile(item.processedBlob, `upscaled_${nameWithoutExt}${ext}`);
      }, i * 300);
    });
  };

    const resetSelection = () => {
    setScaleFactor(2);
  };

  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[320px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 flex flex-col h-full space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-50/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-50/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1 custom-scrollbar">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer bg-slate-100 transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300'}`}>
                        <img src={item.processedUrl || item.dataUrl} className="w-full h-full object-cover" />
                        {item.processedBlob && (
                          <div className="absolute top-1 left-1 bg-emerald-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <button onClick={(e) => removeFile(e, idx)} className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"><X className="w-2.5 h-2.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Scale Level Selection */}
            <div className={`flex flex-col gap-3 transition-opacity duration-300 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. Choose Upscale Level</h3>
              
              <div className="grid grid-cols-3 gap-2">
                {PRESET_SCALES.map(preset => {
                  const isActive = scaleFactor === preset.value;
                  return (
                    <button
                      key={preset.value}
                      onClick={() => setScaleFactor(preset.value)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${isActive ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-[inset_0_2px_10px_rgba(59,130,246,0.05)]' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:bg-slate-50'}`}
                    >
                      <span className={`text-2xl font-black ${isActive ? 'text-blue-600' : 'text-slate-800'}`}>{preset.value}x</span>
                      <span className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-wider mt-1 leading-tight">{preset.label}</span>
                    </button>
                  )
                })}
              </div>
              
              {activeFile && (
                <div className={`mt-2 text-xs p-3 rounded-lg border flex gap-2 items-start ${activeFile.origW * scaleFactor > 10000 || activeFile.origH * scaleFactor > 10000 ? 'bg-red-50 border-red-200 text-red-600 font-semibold shadow-sm' : 'bg-white border-slate-200 text-slate-600 font-semibold shadow-sm'}`}>
                  {activeFile.origW * scaleFactor > 10000 || activeFile.origH * scaleFactor > 10000 ? (
                    <><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> Exceeds 10,000px safety limit!</>
                  ) : (
                    <>Target Output: <strong>{activeFile.origW * scaleFactor} × {activeFile.origH * scaleFactor} px</strong></>
                  )}
                </div>
              )}
            </div>

            {/* 3. Actions */}
            <div className={`mt-auto pt-4 flex flex-col gap-2 ${!activeFile ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
              <button 
                onClick={applyUpscaling}
                disabled={!activeFile || isProcessing || (activeFile.origW * scaleFactor > 10000 || activeFile.origH * scaleFactor > 10000)} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? <><Zap className="w-4 h-4 animate-bounce" /> Upscaling...</> : <><MonitorPlay className="w-4 h-4" /> Start Upscaling</>}
              </button>
              <button 
                onClick={resetSelection}
                disabled={!activeFile || isProcessing}
                className="w-full py-2 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-bold rounded-lg border border-slate-200 transition-colors disabled:opacity-50"
              >
                Reset Selection
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 relative border-l border-slate-200 bg-slate-100 p-4 sm:p-5">
          
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[450px]">
              <ImageIcon className="w-16 h-16 text-slate-600 mb-4 opacity-70" />
              <h3 className="text-xl font-bold text-slate-500 mb-2">No Image Uploaded</h3>
              <p className="text-sm mt-2 text-slate-400 max-w-[320px]">Upload single or multiple images using the left panel to configure scaling multipliers and start processing.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full gap-4 overflow-y-auto">
              
              {/* Stage Header */}
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Active Image:</span>
                  <strong className="truncate max-w-[150px] sm:max-w-xs">{activeFile.name}</strong>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 uppercase tracking-wider">
                    Original: {activeFile.origW ? `${activeFile.origW}×${activeFile.origH} px` : '-'}
                  </span>
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-bold border border-blue-200 uppercase tracking-wider">
                    Scale: {scaleFactor}x
                  </span>
                </div>
                
                <div className="hidden sm:block">
                  <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold border border-indigo-200 uppercase tracking-wider">
                    Before / After Comparison
                  </span>
                </div>
              </div>

              {/* Viewport - Split Slider */}
              <div 
                className="flex-1 bg-slate-100 rounded-xl border border-slate-200 relative overflow-hidden min-h-[400px] max-h-[600px] shrink-0"
                style={{
                  backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 0)',
                  backgroundSize: '16px 16px'
                }}
              >
                <div 
                  ref={sliderContainerRef}
                  className="absolute inset-4 rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.06)] cursor-crosshair touch-none select-none border border-slate-200 bg-white"
                  onMouseDown={(e) => { setIsDraggingSlider(true); handleSliderMove(e); }}
                  onTouchStart={(e) => { setIsDraggingSlider(true); handleSliderMove(e); }}
                >
                  
                  {/* Before (Original) */}
                  <img 
                    src={activeFile.dataUrl} 
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    alt="Original"
                  />
                  
                  {/* After (Upscaled/Scaled) */}
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none filter"
                    alt="Upscaled"
                    style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)`, imageRendering: activeFile.processedBlob ? 'auto' : 'pixelated' }}
                  />

                  {/* Drag Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-blue-500 z-10 flex items-center justify-center cursor-ew-resize shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                    style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => { e.stopPropagation(); setIsDraggingSlider(true); }}
                    onTouchStart={(e) => { e.stopPropagation(); setIsDraggingSlider(true); }}
                  >
                    <div className="absolute top-0 bottom-0 w-[2px] bg-white opacity-80" />
                    <div className="w-9 h-9 bg-blue-500 rounded-full border-2 border-white text-white flex items-center justify-center font-bold text-lg shadow-[0_4px_10px_rgba(0,0,0,0.15)] transition-transform hover:scale-110">
                      ↔
                    </div>
                  </div>
                  
                  {/* Badges for Split View Context */}
                  <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider">
                    Original
                  </div>
                  <div className="absolute bottom-4 right-4 bg-blue-600/90 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded border border-white/20 uppercase tracking-wider">
                    Upscaled
                  </div>

                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl shrink-0 z-20 shadow-sm">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {activeFile.processedBlob 
                    ? `Ready to download. Output resolution: ${activeFile.origW * scaleFactor}×${activeFile.origH * scaleFactor} px.` 
                    : `Target scale factor: ${scaleFactor}x. Click "Start Upscaling" to process.`}
                </div>
                
                <div className="flex gap-3">
                  {uploadedFiles.length > 1 && uploadedFiles.some(f => f.processedBlob) && (
                    <button 
                      onClick={saveAllImages}
                      className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <Package className="w-4 h-4" /> Save All
                    </button>
                  )}
                  
                  <button 
                    onClick={() => {
                      const nameWithoutExt = activeFile.name.replace(/\.[^/.]+$/, "");
                      const ext = activeFile.file.name.substring(activeFile.file.name.lastIndexOf("."));
                      downloadFile(activeFile.processedBlob, `upscaled_${nameWithoutExt}${ext}`);
                    }}
                    disabled={!activeFile.processedBlob}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md"
                  >
                    <Download className="w-4 h-4" /> Save Upscaled Image
                  </button>
                </div>
              </div>

            </div>
          )}
        </main>

      </div>
    </div>
  );
};

export default ImageUpscalingAISuperResolution;

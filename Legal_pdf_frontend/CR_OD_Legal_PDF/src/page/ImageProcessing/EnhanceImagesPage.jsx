import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  UploadCloud, X, Zap, Download, Package, ArrowLeft, Wand2, Star, Sparkles, Activity
} from 'lucide-react';

const ENHANCE_LEVELS = [
  { id: 'low', label: 'Low', sub: 'Subtle touch', icon: Star },
  { id: 'medium', label: 'Medium', sub: 'Optimal (Rec)', icon: Sparkles },
  { id: 'high', label: 'High', sub: 'Strong boost', icon: Zap },
  { id: 'ultra', label: 'Ultra AI', sub: 'Scanned/Blurry', icon: Activity },
];

const EnhanceImages = ({ tool, onBack }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  
  // Settings
  const [selectedLevel, setSelectedLevel] = useState('medium');
  const [autoColor, setAutoColor] = useState(true);
  const [denoise, setDenoise] = useState(true);

  // Slider State
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const sliderRef = useRef(null);
  const isDraggingSlider = useRef(false);

  const fileInputRef = useRef(null);

  // --- FILE HANDLING ---
  const processFiles = (files) => {
    const validFiles = Array.from(files).filter(f => f.type.match(/image\/(jpeg|png|webp|bmp|tiff)/));
    if (validFiles.length === 0) return alert("No valid image files.");

    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        setUploadedFiles(prev => {
          const newItem = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            name: file.name,
            dataUrl: url,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            level: 'medium',
            autoColor: true,
            denoise: true,
            processedBlob: null,
            processedUrl: null
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

  // --- SLIDER LOGIC ---
  const handleSliderMove = useCallback((clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(x, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingSlider.current) handleSliderMove(e.clientX);
    };
    const handleMouseUp = () => {
      isDraggingSlider.current = false;
    };
    const handleTouchMove = (e) => {
      if (isDraggingSlider.current && e.touches[0]) handleSliderMove(e.touches[0].clientX);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleSliderMove]);

  // Sync Settings to Active File when they change
  useEffect(() => {
    if (activeFile && (activeFile.level !== selectedLevel || activeFile.autoColor !== autoColor || activeFile.denoise !== denoise)) {
      setUploadedFiles(prev => {
        const up = [...prev];
        if (up[activeIndex]) {
          up[activeIndex].level = selectedLevel;
          up[activeIndex].autoColor = autoColor;
          up[activeIndex].denoise = denoise;
          up[activeIndex].processedBlob = null; // Invalidate cache
          if (up[activeIndex].processedUrl) URL.revokeObjectURL(up[activeIndex].processedUrl);
          up[activeIndex].processedUrl = null;
        }
        return up;
      });
    }
  }, [selectedLevel, autoColor, denoise, activeFile, activeIndex]);

  // Sync state when active index changes
  useEffect(() => {
    if (activeFile) {
      setSelectedLevel(activeFile.level);
      setAutoColor(activeFile.autoColor);
      setDenoise(activeFile.denoise);
      setSliderPos(50); // Reset slider to center
    }
  }, [activeIndex]);


  // --- PROCESSING LOGIC ---
  const applyEnhancement = async () => {
    if (!activeFile) return;
    setIsProcessing(true);
    
    try {
      // Simulate Backend AI Enhancement via Canvas Filters
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = activeFile.dataUrl;
      await new Promise(r => img.onload = r);
      
      canvas.width = activeFile.origW;
      canvas.height = activeFile.origH;
      const ctx = canvas.getContext('2d');
      
      let filterStr = '';
      if (activeFile.level === 'low') filterStr = 'contrast(110%) saturate(110%) brightness(102%)';
      else if (activeFile.level === 'medium') filterStr = 'contrast(120%) saturate(120%) brightness(105%)';
      else if (activeFile.level === 'high') filterStr = 'contrast(130%) saturate(135%) brightness(110%)';
      else if (activeFile.level === 'ultra') filterStr = 'contrast(140%) saturate(150%) brightness(115%) sepia(5%)';
      
      if (!activeFile.autoColor) filterStr = filterStr.replace(/saturate\(\d+%\)/, ''); // Remove saturate if no auto color
      
      ctx.filter = filterStr;
      ctx.drawImage(img, 0, 0);
      
      // Basic denoise simulation (slight blur then draw over with alpha) if denoise is true
      if (activeFile.denoise && activeFile.level !== 'low') {
         ctx.globalAlpha = 0.5;
         ctx.filter = 'blur(1px)';
         ctx.drawImage(canvas, 0, 0);
         ctx.globalAlpha = 1.0;
      }
      
      canvas.toBlob((blob) => {
        setUploadedFiles(prev => {
          const up = [...prev];
          up[activeIndex].processedBlob = blob;
          up[activeIndex].processedUrl = URL.createObjectURL(blob);
          return up;
        });
        setIsProcessing(false);
        setSliderPos(50); // Reset slider to show both
      }, activeFile.file.type);
      
    } catch(err) {
      console.error("Enhancement Error:", err);
      setIsProcessing(false);
      alert("Failed to enhance image.");
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
    if (processed.length === 0) return alert("No enhanced images available to save.");
    
    if (processed.length === 1) {
      const idx = uploadedFiles.findIndex(f => f.id === processed[0].id);
      setActiveIndex(idx);
      setTimeout(() => downloadFile(processed[0].processedBlob, `enhanced_${processed[0].name}`), 100);
      return;
    }
    
    alert("Batch ZIP saving requires the backend API which is currently simulated.");
  };


  return (
    <div className="flex-1 flex flex-col w-full min-h-0 relative bg-transparent overflow-hidden px-4 sm:px-12 md:px-20 lg:px-28 xl:px-36 pb-4 sm:pb-8">
      
      

      <div className="flex-1 flex flex-col lg:flex-row w-full max-w-[1536px] mx-auto border border-slate-200 bg-white overflow-hidden rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.05)]">
        
        {/* Left Sidebar */}
        <aside className="w-full lg:w-[360px] border-r border-slate-200 bg-slate-50 flex flex-col shrink-0 overflow-y-auto z-20">
          <div className="p-5 space-y-6">
            
            {/* 1. Upload */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">1. Upload Image(s)</h3>
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDraggingFile ? 'border-blue-500 bg-blue-500/5' : 'border-slate-300 hover:border-blue-500 hover:bg-blue-500/5'}`}
              >
                <UploadCloud className={`w-8 h-8 mx-auto mb-2 ${isDraggingFile ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-sm text-slate-700 font-bold mb-1">Click or drag images here</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">JPG, PNG, WEBP, BMP</p>
                <input type="file" ref={fileInputRef} onChange={(e) => processFiles(e.target.files)} multiple accept="image/*" className="hidden" />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gallery ({uploadedFiles.length})</h4>
                  <div className="grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto p-1">
                    {uploadedFiles.map((item, idx) => (
                      <div key={item.id} onClick={() => setActiveIndex(idx)} className={`relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition-all group ${idx === activeIndex ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105' : 'border-transparent hover:border-slate-300 bg-slate-100'} ${item.processedBlob ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-50' : ''}`}>
                        <img src={item.dataUrl} className="w-full h-full object-cover bg-slate-100" />
                        <button onClick={(e) => removeFile(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-[#E57373] text-white rounded-full flex items-center justify-center scale-75 opacity-0 group-hover:opacity-100 hover:scale-100 transition-all z-10 shadow-md"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Settings */}
            <div className={`flex flex-col gap-3 transition-opacity ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pb-2 border-b border-slate-200">2. AI Enhancement Level</h3>
              
              <div className="grid grid-cols-2 gap-2 mb-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                {ENHANCE_LEVELS.map(lvl => {
                  const Icon = lvl.icon;
                  const isActive = selectedLevel === lvl.id;
                  return (
                    <button 
                      key={lvl.id}
                      onClick={() => setSelectedLevel(lvl.id)}
                      className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${isActive ? 'bg-blue-50 border-blue-600 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs">{lvl.label}</span>
                      <span className="text-[9px] font-medium text-slate-400">{lvl.sub}</span>
                    </button>
                  )
                })}
              </div>

              <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={autoColor} onChange={(e) => setAutoColor(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                  <span className="text-sm font-bold text-slate-700">Auto Color & Balance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={denoise} onChange={(e) => setDenoise(e.target.checked)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                  <span className="text-sm font-bold text-slate-700">Noise Denoising</span>
                </label>
              </div>

            </div>

            {/* 3. Actions */}
            <div className={`flex flex-col gap-2 mt-auto pt-4 ${!activeFile ? 'opacity-50 pointer-events-none' : ''}`}>
              <button 
                onClick={applyEnhancement} 
                disabled={isProcessing} 
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isProcessing ? 'Processing AI...' : <><Wand2 className="w-5 h-5" /> Start AI Processing</>}
              </button>
            </div>

          </div>
        </aside>

        {/* Right Stage */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-100 relative border-l border-slate-200">
          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <Wand2 className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-500">No Image Loaded</h3>
              <p className="text-sm mt-2 text-slate-400 text-center max-w-sm">Upload an image to configure and apply AI enhancement.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-200 shrink-0 bg-slate-50 z-20">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-widest hidden sm:block">Active File</span>
                  <strong className="text-slate-800 truncate max-w-[150px] sm:max-w-[250px]">{activeFile.name}</strong>
                  <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold hidden sm:inline-block">Original: {activeFile.origW}x{activeFile.origH}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${activeFile.processedBlob ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {activeFile.processedBlob ? '✓ AI Enhanced' : 'Preview Mode'}
                  </span>
                </div>
              </div>

              {/* Viewport & Slider */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-slate-100 relative z-10">
                
                <div 
                  ref={sliderRef}
                  className="relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] rounded-sm border border-slate-200 bg-white inline-block max-w-full"
                  style={{ maxHeight: '60vh' }}
                  onMouseDown={(e) => { isDraggingSlider.current = true; handleSliderMove(e.clientX); }}
                  onTouchStart={(e) => { isDraggingSlider.current = true; handleSliderMove(e.touches[0].clientX); }}
                >
                  
                  {/* AFTER Image (Bottom Layer - Enhanced) */}
                  <img 
                    src={activeFile.processedUrl || activeFile.dataUrl} 
                    alt="After" 
                    className="block w-auto max-w-full object-contain pointer-events-none rounded-sm"
                    style={{ maxHeight: '60vh' }}
                  />
                  
                  {/* BEFORE Image (Top Layer - Original) clipped by slider position */}
                  <div 
                    className="absolute top-0 left-0 bottom-0 overflow-hidden z-10 pointer-events-none rounded-sm"
                    style={{ width: `${sliderPos}%` }}
                  >
                    <img 
                      src={activeFile.dataUrl} 
                      alt="Before" 
                      className="block max-w-none object-fill pointer-events-none"
                      style={{ 
                        height: '100%',
                        width: sliderRef.current ? sliderRef.current.offsetWidth + 'px' : 'auto' 
                      }}
                    />
                  </div>

                  {/* Slider Handle */}
                  {activeFile.processedBlob && (
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-20 -translate-x-1/2 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                      style={{ left: `${sliderPos}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-slate-800 rounded-full flex items-center justify-center font-bold text-xs shadow-md border border-slate-200">
                        ↔
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  {activeFile.processedBlob && (
                    <>
                      <div className="absolute bottom-3 left-3 bg-slate-900/75 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none">Before</div>
                      <div className="absolute bottom-3 right-3 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded z-30 pointer-events-none">After</div>
                    </>
                  )}
                  
                </div>

              </div>

              {/* Bottom Bar */}
              <div className="p-4 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 shadow-[0_-4px_25px_rgba(0,0,0,0.02)] z-20">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider hidden sm:block">
                  {activeFile.processedBlob ? `Level: ${activeFile.level.toUpperCase()} | Ready to save` : `Level: ${activeFile.level.toUpperCase()} | Click "Start AI Processing"`}
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {uploadedFiles.length > 1 && (
                    <button 
                      onClick={saveAllImages}
                      className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" /> Save All ({uploadedFiles.filter(f => f.processedBlob).length})
                    </button>
                  )}
                  
                  <button 
                    onClick={() => downloadFile(activeFile.processedBlob, `enhanced_${activeFile.name}`)}
                    disabled={!activeFile.processedBlob}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 shadow-md shadow-blue-500/10"
                  >
                    <Download className="w-4 h-4" /> Save Optimized Image
                  </button>
                </div>
              </div>
            </>
          )}
        </main>

      </div>
    </div>
  );
};

export default EnhanceImages;
